import type { Rental, RentalSourceAdapter } from "../types";

const SEARCH_URL = "https://www.bnproperties.co.nz/property/";

const LOCAL_AREAS = [
  "blenheim",
  "blenheim central",
  "redwoodtown",
  "witherlea",
  "springlands",
  "mayfield",
  "burleigh",
  "riverlands",
  "riversdale",
  "grovetown",
  "omaka",
  "islington",
  "fairhall",
  "rarangi",
  "renwick",
  "picton",
];

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
    return new URL(href, SEARCH_URL).toString();
  } catch {
    return null;
  }
}

function isLocal(text: string): boolean {
  const lower = text.toLowerCase();
  return LOCAL_AREAS.some((area) => lower.includes(area));
}

function listingIdFromUrl(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts.at(-1) ?? new URL(url).pathname;
}

function suburbFromAddress(address: string): string | undefined {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.at(-1) : undefined;
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseDetailPage(html: string, url: string): Rental | null {
  const plain = textFromHtml(html);
  if (!isLocal(plain)) return null;

  const rentMatch = plain.match(/\$\s?([\d,]+)\s*(?:pw|per\s*week)\b/i);
  if (!rentMatch) return null;
  const rent = Number(rentMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(rent) || rent <= 0) return null;

  const headingMatches = [
    ...html.matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi),
  ]
    .map((match) => textFromHtml(match[1]))
    .filter(Boolean);

  let address = headingMatches.find((heading) => /^\d+[A-Za-z/]?\s+/.test(heading));

  if (!address) {
    const streetMatch = plain.match(
      /\b\d+[A-Za-z]?(?:\/\d+[A-Za-z]?)?\s+[A-Za-z0-9' .-]{2,70}\b(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Crescent|Cres|Terrace|Tce|Way|Alley|Grove|Close)\b(?:\s*,?\s*[A-Za-z][A-Za-z -]{1,30})?/i,
    );
    address = streetMatch?.[0]?.trim();
  }

  if (!address || !isLocal(`${address} ${plain}`)) return null;

  const sourceListingId = listingIdFromUrl(url);
  return {
    id: `bn:${sourceListingId}`,
    address,
    suburb: suburbFromAddress(address),
    area: "Blenheim",
    rent,
    bedrooms: firstNumber(plain, /\b(\d+)\s+bedrooms?\b/i),
    bathrooms: firstNumber(plain, /\b(\d+)\s+(?:full\s+)?bathrooms?\b/i),
    source: "B&N Properties",
    sourceListingId,
    url,
  };
}

function detailUrlsFromIndex(html: string): string[] {
  const urls = new Set<string>();
  const linkPattern = /href\s*=\s*(["'])([^"']*\/property\/[^"'#?]+\/?)["']/gi;

  for (const match of html.matchAll(linkPattern)) {
    const url = absoluteUrl(decodeHtml(match[2]));
    if (url && new URL(url).hostname.endsWith("bnproperties.co.nz")) urls.add(url);
  }

  return [...urls].slice(0, 30);
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-NZ,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; BlenheimRentals/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`B&N returned HTTP ${response.status}`);
  return response.text();
}

async function fetchRentals(): Promise<Rental[]> {
  const indexHtml = await fetchHtml(SEARCH_URL);
  const detailUrls = detailUrlsFromIndex(indexHtml);
  if (detailUrls.length === 0) throw new Error("B&N returned no property links");

  const settled = await Promise.allSettled(
    detailUrls.map(async (url) => parseDetailPage(await fetchHtml(url), url)),
  );

  const rentals = settled.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );

  if (rentals.length === 0) throw new Error("B&N returned no Marlborough rentals");
  return rentals;
}

export const bnPropertiesSource: RentalSourceAdapter = {
  name: "B&N Properties",
  enabled: process.env.BNPROPERTIES_ENABLED !== "false",
  fetchRentals,
};
