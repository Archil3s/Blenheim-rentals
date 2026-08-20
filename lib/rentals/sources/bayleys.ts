import { extractListingImages } from "../html-images";
import type { Rental, RentalSourceAdapter } from "../types";

const OFFICE_URL = "https://marlborough.bayleys.co.nz/offices/marlborough-410";
const BAYLEYS_ORIGIN = "https://marlborough.bayleys.co.nz";

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
    return new URL(decodeHtml(href), BAYLEYS_ORIGIN).toString();
  } catch {
    return null;
  }
}

function detailUrlsFromOffice(html: string): string[] {
  const rentLikely: string[] = [];
  const fallback: string[] = [];
  const seen = new Set<string>();
  const pattern = /<a\b[^>]*href\s*=\s*(["'])([^"']*\/listings\/residential\/marlborough\/marlborough\/[^"'#?]+-\d+)\1[^>]*>/gi;

  for (const match of html.matchAll(pattern)) {
    const url = absoluteUrl(match[2]);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const index = match.index ?? 0;
    const context = textFromHtml(html.slice(Math.max(0, index - 1100), Math.min(html.length, index + 1800)));
    if (/\bFor Rent\b|\bper week\b|\bAvailable\b/i.test(context)) {
      rentLikely.push(url);
    } else {
      fallback.push(url);
    }
  }

  const ordered = [...rentLikely, ...fallback];
  return ordered.slice(0, rentLikely.length > 0 ? Math.min(30, rentLikely.length + 6) : 18);
}

function headingText(html: string): string[] {
  return [...html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => textFromHtml(match[1]))
    .filter(Boolean);
}

function firstNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function listingIdFromUrl(url: string): string {
  const slug = new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? "";
  return slug.match(/(\d+)$/)?.[1] ?? slug;
}

function suburbFromAddress(address: string): string | undefined {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.at(-2) ?? parts.at(-1) : undefined;
}

function firstEmail(html: string, plain: string): string | undefined {
  const mailto = html.match(/mailto:([^"'?<>\s]+@[^"'?<>\s]+)/i)?.[1];
  return mailto || plain.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
}

function firstPhone(html: string, plain: string): string | undefined {
  const tel = html.match(/href\s*=\s*(["'])tel:([^"']+)\1/i)?.[2];
  return tel?.replace(/\s+/g, " ").trim() || plain.match(/(?:\+64|0)\s?2\d(?:[\s-]?\d){6,8}|(?:\+64|0)\s?3(?:[\s-]?\d){7,8}/)?.[0];
}

function contactName(plain: string): string | undefined {
  const labelled = plain.match(/([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3})\s+Residential Property Manager\b/);
  if (labelled?.[1]) return labelled[1].trim();

  const presented = plain.match(/Presented by\s+([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3})/i);
  return presented?.[1]?.trim();
}

function parseDetailPage(html: string, url: string): Rental | null {
  const plain = textFromHtml(html);
  if (!/\bFor Rent\b/i.test(plain)) return null;

  const rentMatch =
    plain.match(/For Rent\s+NZ\$\s?([\d,]+)\s*per\s*week/i) ||
    plain.match(/\bRent\s*[:$]?\s*\$?\s?([\d,]+)\s*(?:per\s*week)?/i) ||
    plain.match(/\$\s?([\d,]+)\s*per\s*week/i);
  if (!rentMatch) return null;

  const rent = Number(rentMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(rent) || rent <= 0) return null;

  const headings = headingText(html);
  const address =
    headings.find((value) => /^\d+[A-Za-z/]?\s+/.test(value) && /Marlborough|Blenheim|Renwick|Havelock|Picton|Seddon|Rarangi|Redwoodtown|Witherlea|Springlands/i.test(value)) ||
    headings.find((value) => /^\d+[A-Za-z/]?\s+/.test(value));
  if (!address) return null;

  const sourceListingId = listingIdFromUrl(url);
  const images = extractListingImages(html, url);
  const manager = contactName(plain);
  const availability = plain.match(/\bAvailable(?:\s+from)?\s*[:\-]?\s*([^|]{1,40}?)(?=\s+Rent\b|\s+Bond\b|\s+Viewing\b|\s+For Rent\b|$)/i)?.[1]?.trim();

  return {
    id: `bayleys:${sourceListingId}`,
    address,
    suburb: suburbFromAddress(address),
    area: "Marlborough",
    region: "Marlborough",
    rent,
    bedrooms: firstNumber(plain, [/\b(\d+)\s+Bedrooms?\b/i, /Bedrooms?\s+(\d+)/i]),
    bathrooms: firstNumber(plain, [/\b(\d+)\s+Bathrooms?\b/i, /Bathrooms?\s+(\d+)/i]),
    parking: firstNumber(plain, [/\b(\d+)\s+Parking\b/i, /Parking\s+(\d+)/i]),
    source: "Bayleys Marlborough",
    sourceListingId,
    url,
    imageUrl: images[0],
    imageUrls: images.length ? images : undefined,
    contactType: "Online",
    propertyType: "Private rental",
    propertyManager: manager || "Bayleys Marlborough",
    contactName: manager,
    contactPhone: firstPhone(html, plain),
    contactEmail: firstEmail(html, plain),
    notes: availability ? `Available: ${availability}. Current Bayleys rental listing.` : "Current Bayleys rental listing.",
    outcome: availability ? `Available: ${availability}` : "Available at last check",
    followUpAction: "Open listing and contact Bayleys Marlborough",
    rating: null,
  };
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-NZ,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; RentalFinderNZ/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
    },
    signal: AbortSignal.timeout(4_000),
  });

  if (!response.ok) throw new Error(`Bayleys returned HTTP ${response.status}`);
  return response.text();
}

async function fetchRentals(): Promise<Rental[]> {
  const officeHtml = await fetchHtml(OFFICE_URL);
  const detailUrls = detailUrlsFromOffice(officeHtml);
  if (detailUrls.length === 0) throw new Error("Bayleys returned no Marlborough listing links");

  const settled = await Promise.allSettled(
    detailUrls.map(async (url) => parseDetailPage(await fetchHtml(url), url)),
  );

  const rentals = settled.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );

  if (rentals.length === 0) throw new Error("Bayleys returned no current Marlborough rentals");

  const byId = new Map<string, Rental>();
  for (const rental of rentals) byId.set(rental.id, rental);
  return [...byId.values()];
}

export const bayleysSource: RentalSourceAdapter = {
  name: "Bayleys Marlborough",
  enabled: process.env.BAYLEYS_ENABLED !== "false",
  fetchRentals,
};
