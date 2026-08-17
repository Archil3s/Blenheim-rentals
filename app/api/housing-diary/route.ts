import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";
import { generateHousingDiary } from "@/lib/rentals/housing-diary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9 _-]+/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 60) || "Client";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientName?: string;
      rentalIds?: string[];
    };

    const clientName = body.clientName?.trim() ?? "";
    if (!clientName) {
      return Response.json({ error: "Client name is required" }, { status: 400 });
    }

    const rentalIds = Array.isArray(body.rentalIds) ? body.rentalIds.slice(0, 15) : [];
    if (rentalIds.length === 0) {
      return Response.json({ error: "Select at least one rental" }, { status: 400 });
    }

    let feed = getCachedFeed(false)?.value;
    if (!feed) {
      feed = await getRentalFeed();
      setCachedFeed(feed);
    }

    const byId = new Map(feed.rentals.map((rental) => [rental.id, rental]));
    const rentals = rentalIds.flatMap((id) => {
      const rental = byId.get(id);
      return rental ? [rental] : [];
    });

    if (rentals.length === 0) {
      return Response.json(
        { error: "Those rentals are no longer in the current feed. Refresh and try again." },
        { status: 409 },
      );
    }

    const diary = await generateHousingDiary(clientName, rentals);
    const filename = `${safeFilename(clientName)} - Housing Search Diary.docx`;

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
