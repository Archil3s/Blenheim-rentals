import type { Rental, RentalSourceAdapter } from "../types";

const SEARCH_PAGES = [
  "https://www.oneroof.co.nz/search/houses-for-rent/district_marlborough-marlborough-270_page_1",
  "https://www.oneroof.co.nz/search/houses-for-rent/district_marlborough-marlborough-270_page_2",
  "https://www.oneroof.co.nz/search/houses-for-rent/district_nelson-nelson-bays-271_page_1",
  "https://www.oneroof.co.nz/search/houses-for-rent/district_nelson-nelson-bays-271_page_2",
  "https://www.oneroof.co.nz/search/houses-for-rent/district_kaik-ura-marlborough-272_page_1",
  "https://www.oneroof.co.nz/search/houses-for-rent/district_kaik-ura-marlborough-272_page_2",
  "https://www.oneroof.co.nz/search/houses-for-rent/district_christchurch-city-canterbury-282_page_1",
  "https://www.oneroof.co.nz/search/houses-for-rent/district_christchurch-city-canterbury-282_page_2",
];

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&nbsp;": " ",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};

function decodeHtml(value: string): string {
  return value.replace(
    /&(?:amp|nbsp|quot|apos|lt|gt);|&#39;/gi,
    (entity) => HTML_ENTITY_MAP[entity.toLowerCase()] ?? entity,
  );
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
    return new URL(href, "https://www.oneroof.co.nz").toString();
  } catch {
    return null;
  }
}

function suburbFromAddress(address: string): string | undefined {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts.at(-1) : undefined;
}

type SearchRegion = "Marlborough" | "Nelson" | "Kaikōura" | "Christchurch";

function regionFromUrl(url: string): SearchRegion | null {
  const pathname = new URL(url).pathname.toLowerCase();

  if (
    pathname.includes("/property/marlborough/kaikoura/") ||
    pathname.includes("/property/marlborough/kaik-ura/") ||
    pathname.includes("/property/marlborough/kaikoura-surrounds/") ||
    pathname.includes("/property/marlborough/kaik-ura-surrounds/")
  ) {
    return "Kaikōura";
  }

  if (pathname.includes("/property/canterbury/")) return "Christchurch";
  if (pathname.includes("/property/marlborough/")) return "Marlborough";
  if (pathname.includes("/property/nelson-bays/") || pathname.includes("/property/nelson/")) {
    return "Nelson";
  }
  return null;
}

function listingIdFromUrl(url: string): string {
  const pathname = new URL(url).pathname;
  const parts = pathname.split("/").filter(Boolean);
  return parts.at(-1) ?? pathname;
}

function parseListingText(text: string, url: string): Rental | null {
  const region = regionFromUrl(url);
  if (!region) return null;

  const rentMatch = text.match(/\$\s?([\d,]+)\s*per\s*week/i);
  if (!rentMatch || rentMatch.index == null) return null;

  const rent = Number(rentMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(rent) || rent <= 0) return null;

  const afterRent = text.slice(rentMatch.index + rentMatch[0].length).trim();
  if (!afterRent) return null;

  const tokens = afterRent.split(/\s+/);
  const trailingNumbers: number[] = [];

  while (tokens.length > 0 && trailingNumbers.length < 3) {
    const last = tokens.at(-1) ?? "";
    if (!/^\d+$/.test(last)) break;
    trailingNumbers.unshift(Number(tokens.pop()));
  }

  const address = tokens.join(" ").replace(/\s+/g, " ").trim();
  if (!address) return null;

  const sourceListingId = listingIdFromUrl(url);
  const suburb = suburbFromAddress(address);

  return {
    id: `oneroof:${sourceListingId}`,
    address,
    suburb,
    area: region,
    region,
    rent,
    bedrooms: trailingNumbers[0] ?? null,
    bathrooms: trailingNumbers[1] ?? null,
    parking: trailingNumbers[2] ?? null,
    source: "OneRoof",
    sourceListingId,
    url,
  };
}

export function parseOneRoofHtml(html: string): Rental[] {
  const listings: Rental[] = [];
  const seen = new Set<string>();
  const anchorPattern = /<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const href = decodeHtml(match[2]);
    const url = absoluteUrl(href);
    if (
      !url ||
      !/\/property\/(?:marlborough|nelson-bays|nelson|canterbury)\//i.test(
        new URL(url).pathname,
      )
    ) {
      continue;
    }

    const text = textFromHtml(match[3]);
    const rental = parseListingText(text, url);
    if (!rental || seen.has(rental.id)) continue;

    seen.add(rental.id);
    listings.push(rental);
  }

  return listings;
}

async function fetchOneRoofPage(url: string): Promise<Rental[]> {
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

  if (!response.ok) {
    throw new Error(`OneRoof returned HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseOneRoofHtml(html);
}

export const oneRoofSource: RentalSourceAdapter = {
  name: "OneRoof",
  enabled: process.env.ONEROOF_ENABLED !== "false",
  async fetchRentals() {
    const settled = await Promise.allSettled(SEARCH_PAGES.map(fetchOneRoofPage));
    const rentals = settled.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    if (rentals.length === 0) {
      const failures = settled
        .filter((result) => result.status === "rejected")
        .map((result) => String((result as PromiseRejectedResult).reason));
      throw new Error(
        failures.length > 0
          ? failures.join("; ")
          : "OneRoof returned no Marlborough, Nelson, Kaikōura or Christchurch listings",
      );
    }

    const byId = new Map<string, Rental>();
    for (const rental of rentals) byId.set(rental.id, rental);
    return [...byId.values()];
  },
};
