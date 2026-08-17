import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";
import { generateHousingDiary } from "@/lib/rentals/housing-diary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function exportDate(value: string) {
  const date = new Date(value);
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

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      rentalIds?: string[];
    };

    const requestedIds = Array.isArray(body.rentalIds)
      ? [...new Set(body.rentalIds.filter((id): id is string => typeof id === "string" && id.length > 0))]
      : [];

    if (requestedIds.length === 0) {
      return Response.json({ error: "No rentals are selected for the diary." }, { status: 400 });
    }

    let feed = getCachedFeed(false)?.value;
    if (!feed) {
      feed = await getRentalFeed();
      setCachedFeed(feed);
    }

    const byId = new Map(feed.rentals.map((rental) => [rental.id, rental]));
    const rentals = requestedIds.flatMap((id) => {
      const rental = byId.get(id);
      return rental ? [rental] : [];
    });

    if (rentals.length === 0) {
      return Response.json(
        { error: "Those rentals are no longer in the current feed. Refresh and try again." },
        { status: 409 },
      );
    }

    const diary = await generateHousingDiary("", rentals);
    const filename = `Housing Search Diary - ${exportDate(feed.checkedAt)}.docx`;

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
    return Response.json({ error: "Could not create the housing diary" }, { status: 500 });
  }
}
