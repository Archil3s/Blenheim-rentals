import type { Rental, RentalSourceAdapter } from "../types";

const SEARCH_URL = "https://www.quinovic.co.nz/for-rent/marlborough/";

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

function detailUrlsFromIndex(html: string): string[] {
  const urls = new Set<string>();
  const pattern = /href\s*=\s*(["'])([^"']*\/rental-properties\/marlborough\/[^"'#?]+)\1/gi;

  for (const match of html.matchAll(pattern)) {
    const url = absoluteUrl(decodeHtml(match[2]));
    if (url && new URL(url).hostname.endsWith("quinovic.co.nz")) urls.add(url);
  }

  return [...urls].slice(0, 40);
}

function headingText(html: string, tag: "h1" | "h2"): string[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map((match) => textFromHtml(match[1]))
    .filter(Boolean);
}

function firstNumber(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function listingIdFromUrl(url: string): string {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts.at(-1) ?? new URL(url).pathname;
}

function contactDetails(plain: string) {
  const individual = plain.match(
    /(?:contact|call)\s+([A-Z][A-Za-z' -]{2,50})\s+(?:on\s+)?((?:\+64|0)\s?\d{1,3}[\s-]?\d{3}[\s-]?\d{3,4})/i,
  );
  const office = plain.match(/Contact\s+Quinovic\s+([A-Za-z /'-]{2,40})/i);
  const email = plain.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phone = individual?.[2] || plain.match(/(?:\+64|0)\s?\(?\d{1,3}\)?[\s-]?\d{3}[\s-]?\d{3,4}/)?.[0];
  const contactName = individual?.[1]?.trim() || (office ? `Quinovic ${office[1].trim()}` : "Quinovic Blenheim");

  return {
    contactName,
    contactPhone: phone || "03 577 8777",
    contactEmail: email || "Blenheim.enquiries@quinovic.com",
  };
}

function parseDetailPage(html: string, url: string): Rental | null {
  const plain = textFromHtml(html);
  if (!/marlborough|blenheim|renwick|picton|springlands|redwoodtown|witherlea/i.test(plain)) {
    return null;
  }

  const rentMatch = plain.match(/\$\s?([\d,]+)\s*per\s*week/i);
  if (!rentMatch) return null;
  const rent = Number(rentMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(rent) || rent <= 0) return null;

  const h1 = headingText(html, "h1");
  const h2 = headingText(html, "h2");
  const address = h1.find((value) => /\d/.test(value)) || h2.find((value) => /\d/.test(value));
  if (!address) return null;

  const suburb = h2.find((value) => !/\d/.test(value) && value.length < 50);
  const bedrooms = firstNumber(plain, /Bedrooms\s+(\d+)/i);
  const bathrooms = firstNumber(plain, /Bathrooms\s+(\d+)/i);
  const propertyType = plain.match(/Property Type\s+([A-Za-z -]{2,30})/i)?.[1]?.trim() || "Private rental";
  const availability = plain.match(/Availability\s+([^#|]{1,35}?)(?=Property Type|Property ID|Contact|About this property|Bedrooms|Bathrooms)/i)?.[1]?.trim();
  const { contactName, contactPhone, contactEmail } = contactDetails(plain);
  const sourceListingId = plain.match(/Property ID\s+([A-Z0-9-]+)/i)?.[1] || listingIdFromUrl(url);

  return {
    id: `quinovic:${sourceListingId}`,
    address: suburb && !address.toLowerCase().includes(suburb.toLowerCase()) ? `${address}, ${suburb}` : address,
    suburb,
    area: "Blenheim",
    rent,
    bedrooms,
    bathrooms,
    source: "Quinovic Blenheim",
    sourceListingId,
    url,
    contactType: "Online",
    propertyType,
    propertyManager: contactName,
    contactName,
    contactPhone,
    contactEmail,
    notes: availability ? `Availability: ${availability}. Current online rental listing.` : "Current online rental listing.",
    outcome: availability ? `Available: ${availability}` : "Available at last check",
    followUpAction: `Open listing and contact ${contactName}`,
    rating: null,
  };
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-NZ,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; BlenheimRentals/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`Quinovic returned HTTP ${response.status}`);
  return response.text();
}

async function fetchRentals(): Promise<Rental[]> {
  const indexHtml = await fetchHtml(SEARCH_URL);
  const detailUrls = detailUrlsFromIndex(indexHtml);
  if (detailUrls.length === 0) throw new Error("Quinovic returned no Marlborough property links");

  const settled = await Promise.allSettled(
    detailUrls.map(async (url) => parseDetailPage(await fetchHtml(url), url)),
  );

  const rentals = settled.flatMap((result) =>
    result.status === "fulfilled" && result.value ? [result.value] : [],
  );

  if (rentals.length === 0) throw new Error("Quinovic returned no Marlborough rentals");
  return rentals;
}

export const quinovicSource: RentalSourceAdapter = {
  name: "Quinovic Blenheim",
  enabled: process.env.QUINOVIC_ENABLED !== "false",
  fetchRentals,
};
