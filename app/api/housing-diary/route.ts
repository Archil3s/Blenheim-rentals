import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";
import { generateHousingDiary } from "@/lib/rentals/housing-diary";
import { selectDiaryRentalsByPriceBand } from "@/lib/rentals/price-bands";

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

export async function POST() {
  try {
    let feed = getCachedFeed(false)?.value;
    if (!feed) {
      feed = await getRentalFeed();
      setCachedFeed(feed);
    }

    const rentals = selectDiaryRentalsByPriceBand(feed.rentals, 15);

    if (rentals.length === 0) {
      return Response.json(
        { error: "No current rentals were found in the $300+ diary price bands." },
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
