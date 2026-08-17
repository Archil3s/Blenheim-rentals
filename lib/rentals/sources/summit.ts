import type { Rental, RentalSourceAdapter } from "../types";

const SEARCH_URLS = [
  "https://summit.co.nz/rent/listings/",
  "https://summit.co.nz/rent/listings/?agent=77",
];

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

const BLENHEIM_MANAGERS = ["Viv Smith", "Kath Grigor", "Virginia Taylor"];

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
    return new URL(href, "https://summit.co.nz").toString();
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

function detailUrlsFromSearch(html: string): string[] {
  const urls = new Set<string>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*(["'])([^"']*\/rent\/listings\/\d+\/?)["'][^>]*>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const url = absoluteUrl(decodeHtml(match[2]));
    if (url) urls.add(url);
  }

  return [...urls].slice(0, 80);
}

function extractHeadingAddress(html: string): string | null {
  const headings = [...html.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
    .map((match) => textFromHtml(match[1]))
    .filter(Boolean);

  return (
    headings.find(
      (heading) =>
        /^\d+[A-Za-z/]?\s+/.test(heading) &&
        /\b(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Place|Pl|Court|Ct|Crescent|Cres|Terrace|Tce|Way|Grove|Close)\b/i.test(
          heading,
        ),
    ) ?? null
  );
}

function extractEmail(html: string): string | undefined {
  const match = html.match(/mailto:([^"'?<>\s]+@summit\.co\.nz)/i);
  return match?.[1];
}

function extractManager(text: string): string | undefined {
  return BLENHEIM_MANAGERS.find((name) => text.includes(name));
}

function extractPhone(text: string, manager?: string): string | undefined {
  const scope = manager
    ? text.slice(Math.max(0, text.indexOf(manager)), text.indexOf(manager) + 220)
    : text;
  const mobile = scope.match(/\b02\d(?:[\s-]?\d){6,8}\b/);
  if (mobile) return mobile[0].replace(/\s+/g, " ");
  const office = text.match(/\b03\s?578\s?0404\b/);
  return office?.[0];
}

function extractAvailability(text: string): string | undefined {
  const match = text.match(/Available:\s*([A-Za-z0-9 ,/-]{2,28}?)(?=\s{2,}|\s(?:Book|Enquire|Apply|Ref:|No Smoking|Pets?|This|The)\b|$)/i);
  return match?.[1]?.trim();
}

function parseDetailPage(html: string, url: string): Rental | null {
  const plain = textFromHtml(html);
  if (!isLocal(plain)) return null;

  const address = extractHeadingAddress(html);
  if (!address || !isLocal(address)) return null;

  const rentMatch = plain.match(/\$\s?([\d,]+)\s*per\s*week/i);
  if (!rentMatch) return null;
  const rent = Number(rentMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(rent) || rent <= 0) return null;

  const manager = extractManager(plain);
  const availability = extractAvailability(plain);
  const sourceListingId = listingIdFromUrl(url);

  return {
    id: `summit:${sourceListingId}`,
    address,
    suburb: suburbFromAddress(address),
    area: "Blenheim",
    rent,
    bedrooms: firstNumber(plain, /\b(\d+)\s*Beds?\b/i),
    bathrooms: firstNumber(plain, /\b(\d+)\s*Baths?\b/i),
    source: "Summit Property Management",
    sourceListingId,
    url,
    propertyManager: "Summit Property Management",
    contactName: manager,
    contactPhone: extractPhone(plain, manager),
    contactEmail: extractEmail(html),
    notes: availability ? `Available: ${availability}` : "Current Summit rental listing",
    outcome: "Available online",
    followUpAction: "Contact Summit Property Management to arrange a viewing",
  };
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

  if (!response.ok) throw new Error(`Summit returned HTTP ${response.status}`);
  return response.text();
}

async function fetchRentals(): Promise<Rental[]> {
  const searchPages = await Promise.allSettled(SEARCH_URLS.map(fetchHtml));
  const detailUrls = new Set<string>();

  for (const result of searchPages) {
    if (result.status !== "fulfilled") continue;
    for (const url of detailUrlsFromSearch(result.value)) detailUrls.add(url);
  }

  if (detailUrls.size === 0) throw new Error("Summit returned no rental detail links");

  const settled = await Promise.allSettled(
    [...detailUrls].map(async (url) => parseDetailPage(await fetchHtml(url), url)),
  );

  const rentals = settled.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );

  if (rentals.length === 0) throw new Error("Summit returned no Marlborough rentals");

  const byId = new Map<string, Rental>();
  for (const rental of rentals) byId.set(rental.id, rental);
  return [...byId.values()];
}

export const summitSource: RentalSourceAdapter = {
  name: "Summit Property Management",
  enabled: process.env.SUMMIT_ENABLED === "true",
  fetchRentals,
};
