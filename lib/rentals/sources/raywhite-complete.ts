import type { Rental, RentalSourceAdapter } from "../types";

const SEARCH_URL =
  "https://completerentals.co.nz/properties/residential-for-rent?category=&suburbPostCode=";

const LOCAL_AREAS = new Set([
  "blenheim",
  "blenheim central",
  "mayfield",
  "redwoodtown",
  "witherlea",
  "springlands",
  "grovetown",
  "riverlands",
  "riversdale",
  "burleigh",
  "islington",
  "omaka",
  "fairhall",
  "rarangi",
  "renwick",
]);

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textFromHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function absoluteUrl(href: string): string | null {
  try {
    return new URL(href, "https://completerentals.co.nz").toString();
  } catch {
    return null;
  }
}

function listingIdFromUrl(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts.at(-1) ?? new URL(url).pathname;
}

function suburbFromAddress(address: string): string | undefined {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts.at(-1) : undefined;
}

function isLocal(address: string): boolean {
  const suburb = suburbFromAddress(address)?.toLowerCase();
  if (suburb && LOCAL_AREAS.has(suburb)) return true;
  const lower = address.toLowerCase();
  return [...LOCAL_AREAS].some((area) => lower.includes(area));
}

function nearestRent(text: string): number | null {
  const matches = [...text.matchAll(/\$\s?([\d,]+)\s*per\s*week/gi)];
  const match = matches.at(-1);
  if (!match) return null;
  const rent = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(rent) && rent > 0 ? rent : null;
}

function firstCount(text: string, label: "bed" | "bath"): number | null {
  const pattern =
    label === "bed" ? /\b(\d+)\s*Beds?\b/i : /\b(\d+)\s*Baths?\b/i;
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

export function parseRayWhiteCompleteHtml(html: string): Rental[] {
  const rentals: Rental[] = [];
  const seen = new Set<string>();
  const detailLink =
    /<a\b[^>]*href\s*=\s*(["'])([^"']*\/properties\/residential-for-rent\/[^"']+\/\d+)\1[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(detailLink)) {
    const url = absoluteUrl(decodeHtml(match[2]));
    if (!url) continue;

    const address = textFromHtml(match[3]);
    if (!address || !isLocal(address)) continue;

    const matchIndex = match.index ?? 0;
    const contextStart = Math.max(0, matchIndex - 1400);
    const contextEnd = Math.min(html.length, matchIndex + match[0].length + 1400);
    const context = textFromHtml(html.slice(contextStart, contextEnd));
    const addressIndex = context.toLowerCase().indexOf(address.toLowerCase());
    const beforeAddress = addressIndex >= 0 ? context.slice(0, addressIndex) : context;
    const afterAddress = addressIndex >= 0 ? context.slice(addressIndex + address.length) : context;

    const rent = nearestRent(beforeAddress);
    if (rent == null) continue;

    const sourceListingId = listingIdFromUrl(url);
    const id = `raywhite-complete:${sourceListingId}`;
    if (seen.has(id)) continue;

    seen.add(id);
    rentals.push({
      id,
      address,
      suburb: suburbFromAddress(address),
      area: "Blenheim",
      rent,
      bedrooms: firstCount(afterAddress, "bed"),
      bathrooms: firstCount(afterAddress, "bath"),
      source: "Ray White Complete PM",
      sourceListingId,
      url,
    });
  }

  return rentals;
}

async function fetchRentals(): Promise<Rental[]> {
  const response = await fetch(SEARCH_URL, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-NZ,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; BlenheimRentals/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Ray White Complete returned HTTP ${response.status}`);
  }

  const rentals = parseRayWhiteCompleteHtml(await response.text());
  if (rentals.length === 0) {
    throw new Error("Ray White Complete returned no local residential rentals");
  }
  return rentals;
}

export const rayWhiteCompleteSource: RentalSourceAdapter = {
  name: "Ray White Complete PM",
  enabled: process.env.RAYWHITE_COMPLETE_ENABLED !== "false",
  fetchRentals,
};
