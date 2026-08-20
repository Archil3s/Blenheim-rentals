import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TTL_MS = 10 * 60 * 1000;
const imageCache = new Map<string, { imageUrls: string[]; createdAt: number }>();
const BAD_IMAGE_HINTS = /(?:logo|icon|avatar|favicon|sprite|placeholder|loading|tracking|pixel|badge|brand|agent|profile|social)/i;
const RESIZE_PARAMS = new Set([
  "w",
  "h",
  "width",
  "height",
  "quality",
  "q",
  "fit",
  "crop",
  "format",
  "fm",
  "auto",
  "dpr",
]);

function decodeMediaText(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/\\u002[fF]/g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003[fF]/g, "?")
    .replace(/\\u003[dD]/g, "=")
    .replace(/\\\//g, "/");
}

function safeHttpUrl(value: string, baseUrl: string) {
  try {
    const url = new URL(decodeMediaText(value), baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (BAD_IMAGE_HINTS.test(`${url.hostname} ${url.pathname} ${url.search}`)) return null;
    return url;
  } catch {
    return null;
  }
}

function imageIdentity(url: URL) {
  const normalized = new URL(url);
  for (const key of [...normalized.searchParams.keys()]) {
    if (RESIZE_PARAMS.has(key.toLowerCase())) normalized.searchParams.delete(key);
  }
  normalized.hash = "";
  return normalized.toString();
}

function initialImages(imageUrl?: string, imageUrls?: string[]) {
  return [...new Set([...(imageUrls ?? []), ...(imageUrl ? [imageUrl] : [])].filter(Boolean))];
}

function extractFullGallery(html: string, listingUrl: string, existing: string[]) {
  const decoded = decodeMediaText(html);
  const knownHosts = new Set(
    existing
      .map((value) => safeHttpUrl(value, listingUrl)?.hostname.toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
  const results: string[] = [];
  const seen = new Set<string>();

  const add = (value?: string | null) => {
    if (!value || results.length >= 60) return;
    const url = safeHttpUrl(value, listingUrl);
    if (!url) return;

    const hostname = url.hostname.toLowerCase();
    const looksLikeImage =
      /\.(?:jpe?g|png|webp|avif)(?:$|\?)/i.test(url.toString()) ||
      /image|photo|media|property|listing/i.test(`${hostname}${url.pathname}`);
    if (!looksLikeImage) return;

    if (knownHosts.size > 0 && !knownHosts.has(hostname)) return;

    const identity = imageIdentity(url);
    if (seen.has(identity)) return;
    seen.add(identity);
    results.push(url.toString());
  };

  for (const value of existing) add(value);

  for (const match of decoded.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
    const tag = match[0];
    for (const attribute of ["src", "data-src", "data-lazy-src", "srcset", "data-srcset"]) {
      const attributeMatch = tag.match(new RegExp(`\\b${attribute}\\s*=\\s*([\"'])(.*?)\\1`, "i"));
      if (!attributeMatch) continue;
      for (const candidate of attributeMatch[2].split(",")) {
        add(candidate.trim().split(/\s+/)[0]);
      }
    }
  }

  for (const match of decoded.matchAll(/<meta\b[^>]*>/gi)) {
    const content = match[0].match(/\bcontent\s*=\s*(["'])(.*?)\1/i)?.[2];
    add(content);
  }

  // OneRoof and several other providers keep the complete gallery in page JSON even
  // when only a few thumbnails are rendered in the search result. Once we know the
  // listing image CDN host from the initial thumbnails, scan same-host URLs from that
  // embedded data so we can recover the complete gallery without scraping every card
  // during the main rental-feed refresh.
  for (const match of decoded.matchAll(/(?:https?:)?\/\/[^"'<>\s\\]+/gi)) {
    add(match[0]);
  }

  return results;
}

async function fetchListingHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-NZ,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; RentalFinderNZ/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
    },
    signal: AbortSignal.timeout(6_000),
  });

  if (!response.ok) throw new Error(`Listing returned HTTP ${response.status}`);
  return response.text();
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return Response.json({ error: "Rental id is required" }, { status: 400 });

  const cached = imageCache.get(id);
  if (cached && Date.now() - cached.createdAt < IMAGE_TTL_MS) {
    return Response.json({ imageUrls: cached.imageUrls }, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  }

  let feed = getCachedFeed(false)?.value;
  if (!feed) {
    feed = await getRentalFeed();
    setCachedFeed(feed);
  }

  const rental = feed.rentals.find((item) => item.id === id);
  if (!rental) return Response.json({ error: "Rental is no longer in the current feed" }, { status: 404 });

  const existing = initialImages(rental.imageUrl, rental.imageUrls);
  if (!rental.url) return Response.json({ imageUrls: existing });

  try {
    const html = await fetchListingHtml(rental.url);
    const imageUrls = extractFullGallery(html, rental.url, existing);
    const result = imageUrls.length ? imageUrls : existing;
    imageCache.set(id, { imageUrls: result, createdAt: Date.now() });
    return Response.json({ imageUrls: result }, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch {
    return Response.json({ imageUrls: existing }, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  }
}
