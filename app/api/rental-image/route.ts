import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;

    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "::1" ||
      host === "0.0.0.0" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchRemoteImage(remoteUrl: string, listingUrl: string) {
  const baseHeaders = {
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-NZ,en;q=0.9",
    "User-Agent":
      "Mozilla/5.0 (compatible; RentalFinderNZ/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
  };

  for (const headers of [
    { ...baseHeaders, Referer: listingUrl },
    baseHeaders,
  ]) {
    try {
      const response = await fetch(remoteUrl, {
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(8_000),
      });

      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && contentType.toLowerCase().startsWith("image/")) {
        return response;
      }
    } catch {
      // Try the next header strategy or image candidate.
    }
  }

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const id = requestUrl.searchParams.get("id")?.trim();
  const requestedIndex = Math.max(0, Number(requestUrl.searchParams.get("index") ?? "0") || 0);

  if (!id) {
    return new Response("Rental id is required", { status: 400 });
  }

  let feed = getCachedFeed(false)?.value;
  if (!feed) {
    feed = await getRentalFeed();
    setCachedFeed(feed);
  }

  const rental = feed.rentals.find((item) => item.id === id);
  if (!rental) {
    return new Response("Rental not found", { status: 404 });
  }

  const photos = rental.imageUrls?.length
    ? rental.imageUrls
    : rental.imageUrl
      ? [rental.imageUrl]
      : [];

  if (photos.length === 0) {
    return new Response("Image not available", { status: 404 });
  }

  const candidateIndexes = [
    requestedIndex,
    ...photos.map((_, index) => index).filter((index) => index !== requestedIndex),
  ];

  for (const index of candidateIndexes) {
    const remoteUrl = photos[index];
    if (!remoteUrl || !isSafeRemoteImageUrl(remoteUrl)) continue;

    const upstream = await fetchRemoteImage(remoteUrl, rental.url);
    if (!upstream) continue;

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  return new Response("Image source unavailable", { status: 502 });
}
