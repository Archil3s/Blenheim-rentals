import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  try {
    const cached = getCachedFeed(forceRefresh);

    if (cached) {
      return Response.json(
        { ...cached.value, fromCache: true },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    const feed = await getRentalFeed();
    setCachedFeed(feed);

    return Response.json(
      { ...feed, fromCache: false },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("Rental feed failed", error);

    return Response.json(
      {
        error: "Unable to refresh rental listings right now.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
