import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";
import type { RentalFeed } from "@/lib/rentals/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function withProxiedImages(feed: RentalFeed) {
  return {
    ...feed,
    rentals: feed.rentals.map((rental) => {
      const photoCount = rental.imageUrls?.length ?? (rental.imageUrl ? 1 : 0);
      if (photoCount === 0) return rental;

      const imageUrls = Array.from(
        { length: photoCount },
        (_, index) => `/api/rental-image?id=${encodeURIComponent(rental.id)}&index=${index}`,
      );

      return {
        ...rental,
        imageUrl: imageUrls[0],
        imageUrls,
      };
    }),
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";

  try {
    const cached = getCachedFeed(forceRefresh);

    if (cached) {
      return Response.json(
        { ...withProxiedImages(cached.value), fromCache: true },
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
      { ...withProxiedImages(feed), fromCache: false },
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
