import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";
import { generateHousingDiary } from "@/lib/rentals/housing-diary";
import type { Rental } from "@/lib/rentals/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXPORT_RENTALS = 250;

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

function cleanClientName(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 120) : "";
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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      clientName?: unknown;
      rentalIds?: string[];
      rentals?: unknown[];
    };

    const clientName = cleanClientName(body.clientName);
    const suppliedRentals = Array.isArray(body.rentals)
      ? body.rentals.filter(isRental).slice(0, MAX_EXPORT_RENTALS)
      : [];

    let rentals: Rental[] = suppliedRentals;
    let checkedAt = suppliedRentals.find((rental) => rental.checkedAt)?.checkedAt;

    // Preferred path: the browser sends the rentals already displayed to the user.
    // This keeps Word generation deterministic and avoids doing extra live listing-page
    // requests while a download is in progress on Cloudflare Workers.
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

      let feed = getCachedFeed(false)?.value;
      if (!feed) {
        feed = await getRentalFeed();
        setCachedFeed(feed);
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

    const diary = await generateHousingDiary(clientName, rentals);
    const filename = `Housing Search Diary - ${exportDate(checkedAt)}.docx`;

    return new Response(diary, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Housing-Diary-Count": String(rentals.length),
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
