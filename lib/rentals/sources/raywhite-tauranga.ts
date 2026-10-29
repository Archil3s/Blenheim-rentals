import { extractListingImages } from "../html-images";
import type { Rental, RentalSourceAdapter } from "../types";

type Office = {
  name: string;
  key: string;
  origin: string;
  phone?: string;
  email?: string;
};

const TAURANGA: Office = {
  name: "Ray White Tauranga",
  key: "raywhite-tauranga",
  origin: "https://rwtauranga.co.nz",
};

const MOUNT: Office = {
  name: "Ray White Mount Maunganui",
  key: "raywhite-mount",
  origin: "https://rwmountmaunganui.co.nz",
  phone: "+64 7 575 2030",
  email: "mtmaunganui.nz@raywhite.com",
};

// Keep explicit suburb names instead of guessing that every "Mt Maunganui"
// address is in Arataki. The same advertised address always gets the same
// region across both sources, allowing cross-office deduplication.
const AREA_ALIASES: ReadonlyArray<{ region: string; aliases: readonly string[] }> = [
  { region: "Arataki", aliases: ["arataki"] },
  { region: "Pāpāmoa Beach", aliases: ["papamoa beach", "papamoa"] },
  { region: "Ōtūmoetai", aliases: ["otumoetai"] },
  { region: "Mount Maunganui", aliases: ["mt maunganui", "mount maunganui", "the mount"] },
];

const TAURANGA_SUBURBS = new Set([
  "tauranga", "tauranga central", "tauranga south", "greerton", "judea",
  "gate pa", "parkvale", "welcome bay", "brookfield", "matua", "bellevue",
  "bethlehem", "maungatapu", "hairini", "ohauiti", "pyes pa", "poike",
  "tauriko", "cherrywood", "tauranga city",
]);

function normalise(value: string): string {
  return value.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

export function classifyTaurangaAddress(address: string): { region: string; suburb: string } | null {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  const localities = parts.slice(1);

  for (const entry of AREA_ALIASES) {
    const suburb = localities.find((part) => entry.aliases.includes(normalise(part)));
    if (suburb) return { region: entry.region, suburb };
  }

  const suburb = localities.find((part) => TAURANGA_SUBURBS.has(normalise(part)));
  return suburb ? { region: "Tauranga", suburb } : null;
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/gi, "&").replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function htmlText(value: string): string {
  return decodeHtml(value.replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function count(text: string, kind: "bed" | "bath"): number | null {
  const pattern = kind === "bed" ? /\b(\d+)\s*Beds?\b/i : /\b(\d+)\s*Baths?\b/i;
  const matched = text.match(pattern);
  return matched ? Number(matched[1]) : null;
}

export function parseTaurangaRayWhiteHtml(html: string, office: Office): Rental[] {
  const rentals: Rental[] = [];
  const seen = new Set<string>();
  const links = /<a\b[^>]*href\s*=\s*(["'])([^"']*\/properties\/residential-for-rent\/[^"']+\/\d+)\1[^>]*>([\s\S]*?)<\/a>/gi;

  // Ray White renders TWO links per property: an "Available ..." badge
  // followed by the address. Critically the weekly rent is often AFTER
  // the address anchor. Parsing one anchor in isolation loses the rent.
  // Group links by property ID, then read the whole card up to the next
  // property's first link so prices cannot bleed into adjacent homes.
  type PropertyGroup = {
    url: URL;
    id: string;
    sourceListingId: string;
    start: number;
    anchors: string[];
  };
  const groups: PropertyGroup[] = [];
  const byId = new Map<string, PropertyGroup>();

  for (const match of html.matchAll(links)) {
    let url: URL;
    try {
      url = new URL(decodeHtml(match[2]), office.origin);
    } catch {
      continue;
    }
    if (url.origin !== office.origin) continue;

    const sourceListingId = url.pathname.split("/").filter(Boolean).at(-1) ?? "";
    if (!/^\d+$/.test(sourceListingId)) continue;
    const id = office.key + ":" + sourceListingId;
    let group = byId.get(id);
    if (!group) {
      group = { url, id, sourceListingId, start: match.index ?? 0, anchors: [] };
      byId.set(id, group);
      groups.push(group);
    }
    group.anchors.push(htmlText(match[3]));
  }

  for (let i = 0; i < groups.length; i++) {
    const property = groups[i];
    const address = property.anchors.find((value) =>
      /^\d/.test(value) && value.length < 160 && Boolean(classifyTaurangaAddress(value)),
    );
    if (!address) continue;
    const location = classifyTaurangaAddress(address);
    if (!location) continue;

    const next = groups[i + 1]?.start ?? html.length;
    const cardHtml = html.slice(property.start, next);
    const card = htmlText(cardHtml);
    const rentMatch = card.match(/\$\s?([\d,]+)\s*per\s*week/i);
    const rent = Number(rentMatch?.[1]?.replace(/,/g, "") ?? 0);
    if (!Number.isFinite(rent) || rent <= 0) continue;
    if (seen.has(property.id)) continue;
    seen.add(property.id);

    const available = card.match(/\bAvailable\s+(Now|Today|Tomorrow|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|\d{1,2}\s+[A-Za-z]+)\b/i)?.[0];
    const images = extractListingImages(cardHtml, property.url.toString(), 6);

    rentals.push({
      id: property.id,
      address,
      suburb: location.suburb,
      area: "Tauranga",
      region: location.region,
      rent,
      bedrooms: count(card, "bed"),
      bathrooms: count(card, "bath"),
      imageUrl: images[0],
      imageUrls: images.length ? images : undefined,
      source: office.name,
      sourceListingId: property.sourceListingId,
      url: property.url.toString(),
      contactType: "Online",
      propertyType: "Private rental",
      propertyManager: office.name,
      contactName: office.name,
      contactPhone: office.phone,
      contactEmail: office.email,
      notes: available ? available + ". Current online rental listing." : "Current online rental listing.",
      outcome: available ?? "Available at last check",
      followUpAction: "Open listing, book viewing or contact " + office.name,
      rating: null,
    });
  }

  return rentals;
}

async function fetchOfficeRentals(office: Office): Promise<Rental[]> {
  const url = office.origin + "/properties/residential-for-rent?category=&suburbPostCode=";
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-NZ,en;q=0.9",
      "User-Agent": "Mozilla/5.0 (compatible; BlenheimRentals/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(office.name + " returned HTTP " + response.status);

  const rentals = parseTaurangaRayWhiteHtml(await response.text(), office);
  if (rentals.length === 0) throw new Error(office.name + " returned no recognised Tauranga-area rentals");
  return rentals;
}

export const rayWhiteTaurangaSource: RentalSourceAdapter = {
  name: TAURANGA.name,
  enabled: process.env.RAYWHITE_TAURANGA_ENABLED !== "false",
  fetchRentals: () => fetchOfficeRentals(TAURANGA),
};

export const rayWhiteMountMaunganuiSource: RentalSourceAdapter = {
  name: MOUNT.name,
  enabled: process.env.RAYWHITE_MOUNT_ENABLED !== "false",
  fetchRentals: () => fetchOfficeRentals(MOUNT),
};
