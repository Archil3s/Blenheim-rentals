import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";
import { enrichRentalContacts } from "@/lib/rentals/contact-enrichment";
import { generateHousingDiary } from "@/lib/rentals/housing-diary";
import type { Rental } from "@/lib/rentals/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_RENTALS = 250;
const MAX_CONTACT_ENRICHMENT = 20;
const CONTACT_ENRICHMENT_BUDGET_MS = 3_000;

function exportDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "current";
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replaceAll("/", "-");
}

function isRental(value: unknown): value is Rental {
  if (!value || typeof value !== "object") return false;
  const rental = value as Partial<Rental>;
  return (
    typeof rental.id === "string" &&
    rental.id.length > 0 &&
    typeof rental.address === "string" &&
    rental.address.length > 0 &&
    typeof rental.source === "string" &&
    typeof rental.url === "string"
  );
}

function needsContactLookup(rental: Rental) {
  const name = rental.contactName?.trim().toLowerCase() ?? "";
  const phone = rental.contactPhone?.trim().toLowerCase() ?? "";
  const email = rental.contactEmail?.trim().toLowerCase() ?? "";
  return (
    !name ||
    name === "website" ||
    name === "oneroof" ||
    !phone ||
    phone === "see original listing" ||
    !email ||
    email === "see original listing"
  );
}

async function boundedContactEnrichment(rentals: Rental[]) {
  const candidates = rentals.filter(needsContactLookup).slice(0, MAX_CONTACT_ENRICHMENT);
  if (candidates.length === 0) return rentals;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const enriched = await Promise.race([
      enrichRentalContacts(candidates),
      new Promise<Rental[]>((resolve) => {
        timer = setTimeout(() => resolve([]), CONTACT_ENRICHMENT_BUDGET_MS);
      }),
    ]);

    if (enriched.length === 0) return rentals;
    const byId = new Map(enriched.map((rental) => [rental.id, rental]));
    return rentals.map((rental) => byId.get(rental.id) ?? rental);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      rentalIds?: string[];
      rentals?: unknown[];
    };

    const suppliedRentals = Array.isArray(body.rentals)
      ? body.rentals.filter(isRental).slice(0, MAX_EXPORT_RENTALS)
      : [];

    let rentals: Rental[] = suppliedRentals;
    let checkedAt = suppliedRentals.find((rental) => rental.checkedAt)?.checkedAt;
    let canEnrichContacts = suppliedRentals.length > 0;

    // Backwards-compatible path for the currently deployed phone UI. If this request
    // lands on a cold Netlify instance, rebuild only the fast feed and do not then spend
    // another several seconds opening individual property pages.
    if (rentals.length === 0) {
      const requestedIds = Array.isArray(body.rentalIds)
        ? [
            ...new Set(
              body.rentalIds.filter(
                (id): id is string => typeof id === "string" && id.length > 0,
              ),
            ),
          ].slice(0, MAX_EXPORT_RENTALS)
        : [];

      if (requestedIds.length === 0) {
        return Response.json({ error: "No rentals are selected for the diary." }, { status: 400 });
      }

      const cached = getCachedFeed(false)?.value;
      let feed = cached;
      if (!feed) {
        feed = await getRentalFeed();
        setCachedFeed(feed);
        canEnrichContacts = false;
      }

      checkedAt = feed.checkedAt;
      const byId = new Map(feed.rentals.map((rental) => [rental.id, rental]));
      rentals = requestedIds.flatMap((id) => {
        const rental = byId.get(id);
        return rental ? [rental] : [];
      });
    }

    if (rentals.length === 0) {
      return Response.json(
        { error: "Those rentals are no longer available for export. Refresh and try again." },
        { status: 409 },
      );
    }

    const exportRentals = canEnrichContacts
      ? await boundedContactEnrichment(rentals)
      : rentals;
    const diary = await generateHousingDiary("", exportRentals);
    const filename = `Housing Search Diary - ${exportDate(checkedAt)}.docx`;

    return new Response(diary, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Housing diary export failed", error);
    return Response.json(
      { error: "Could not create the housing diary. Please try again." },
      { status: 500 },
    );
  }
}
