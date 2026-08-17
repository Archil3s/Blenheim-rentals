import type { Rental } from "./types";

const PERSON =
  "[A-Z][A-Za-z'’.-]+(?:\\s+(?:(?:de|du|van|von|te|la|le|der|den)|[A-Z][A-Za-z'’.-]+)){1,4}";

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function textFromHtml(value: string) {
  return decodeHtml(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function isPlaceholder(value?: string | null) {
  const text = compact(value).toLowerCase();
  return (
    !text ||
    text === "see original listing" ||
    text === "not provided" ||
    text === "website" ||
    text === "website listing" ||
    text === "online listing"
  );
}

function isGenericName(value: string | undefined, rental: Rental) {
  const text = compact(value).toLowerCase();
  if (!text) return true;
  const source = rental.source.toLowerCase();
  return (
    text === source ||
    text === "website" ||
    text.includes("website listing") ||
    text.includes("online listing") ||
    text.includes("property management team") ||
    text.endsWith("property management") ||
    text === "ray white blenheim" ||
    text === "ray white blenheim property management" ||
    text === "ray white complete property management" ||
    text === "quinovic blenheim" ||
    text === "oneroof"
  );
}

function firstMailto(html: string) {
  const matches = [...html.matchAll(/href\s*=\s*(["'])mailto:([^"'?<>\s]+@[^"'?<>\s]+)\1/gi)];
  return matches
    .map((match) => decodeHtml(match[2]).trim())
    .find(
      (email) =>
        !/privacy|support|webmaster|noreply|no-reply/i.test(email) &&
        !/@oneroof\.co\.nz$/i.test(email),
    );
}

function firstEmail(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return matches.find(
    (email) =>
      !/privacy|support|webmaster|noreply|no-reply/i.test(email) &&
      !/@oneroof\.co\.nz$/i.test(email),
  );
}

function allTel(html: string) {
  return [...html.matchAll(/href\s*=\s*(["'])tel:([^"']+)\1/gi)]
    .map((match) => decodeHtml(match[2]).replace(/\s+/g, " ").trim())
    .filter((phone) => /(?:\+64|0)\s?\d/.test(phone));
}

function allNzPhones(text: string) {
  const pattern = /(?:\+64\s?2\d|\b02\d)(?:[\s-]?\d){6,8}\b|(?:\+64\s?[3-9]|\b0[3-9])(?:[\s-]?\d){7,8}\b/g;
  return [...text.matchAll(pattern)].map((match) => match[0].replace(/\s+/g, " "));
}

function plausiblePerson(value: string | undefined) {
  if (!value) return undefined;
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length < 5 || name.length > 60) return undefined;
  if (
    /property|management|rentals?|office|team|enquir|contact|agent|additional details|property id|listed on|updated|real estate|marlborough district|nelson|website/i.test(
      name,
    )
  ) {
    return undefined;
  }
  if (!new RegExp(`^${PERSON}$`).test(name)) return undefined;
  return name;
}

function contactNameFromText(text: string) {
  const labelledPatterns = [
    new RegExp(`\\bProperty Manager\\s*[:\\-]?\\s*(${PERSON})`),
    new RegExp(`\\bRentals? Manager\\s*[:\\-]?\\s*(${PERSON})`),
    new RegExp(`\\bLeasing Agent\\s*[:\\-]?\\s*(${PERSON})`),
    new RegExp(`\\bListed by\\s+(${PERSON})`),
    new RegExp(`\\bContact\\s+(${PERSON})\\s+(?:on|at)\\b`),
    new RegExp(`\\bAgent\\s*[:\\-]?\\s*(${PERSON})`),
  ];

  for (const pattern of labelledPatterns) {
    const candidate = plausiblePerson(text.match(pattern)?.[1]);
    if (candidate) return candidate;
  }

  const roleAfterName = text.match(
    new RegExp(
      `\\b(${PERSON})\\s+(?:(?:Blenheim|Picton|Marlborough|Nelson)\\s+)?(?:Area Manager|Property Manager|Rentals? Manager|Leasing Agent)\\b`,
    ),
  );
  const roleCandidate = plausiblePerson(roleAfterName?.[1]);
  if (roleCandidate) return roleCandidate;

  const nameBeforeMobile = text.match(
    new RegExp(`\\b(${PERSON})\\s+(?:(?:Image|Photo)\\s+)?(?:\\+64\\s?2\\d|02\\d)(?:[\\s-]?\\d){3,8}`, "i"),
  );
  return plausiblePerson(nameBeforeMobile?.[1]);
}

function lastPersonBefore(text: string, needle: string) {
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return undefined;
  const before = text.slice(Math.max(0, index - 320), index);
  const matches = [...before.matchAll(new RegExp(`\\b(${PERSON})\\b`, "g"))];
  for (const match of matches.reverse()) {
    const candidate = plausiblePerson(match[1]);
    if (candidate) return candidate;
  }
  return undefined;
}

function oneRoofContactScope(plain: string) {
  const additional = plain.indexOf("Additional details");
  if (additional >= 0) return plain.slice(additional, additional + 2600);

  const propertyId = plain.indexOf("Property ID");
  if (propertyId >= 0) return plain.slice(Math.max(0, propertyId - 300), propertyId + 2200);

  return plain;
}

function contactScope(rental: Rental, plain: string) {
  try {
    if (new URL(rental.url).hostname.endsWith("oneroof.co.nz")) {
      return oneRoofContactScope(plain);
    }
  } catch {
    // Keep the full page as the fallback scope.
  }
  return plain;
}

function choosePhone(scope: string, html: string) {
  const scopedPhones = allNzPhones(scope);
  const mobile = scopedPhones.find((phone) => /(?:\+64\s?2|\b02)/.test(phone));
  if (mobile) return mobile;
  if (scopedPhones[0]) return scopedPhones[0];

  const linked = allTel(html);
  const linkedMobile = linked.find((phone) => /(?:\+64\s?2|\b02)/.test(phone));
  return linkedMobile || linked[0];
}

function cleanMediaValue(value: string) {
  return decodeHtml(value)
    .replace(/\\u002f/gi, "/")
    .replace(/\\\//g, "/")
    .trim();
}

function absoluteMediaUrl(value: string, baseUrl: string) {
  try {
    return new URL(cleanMediaValue(value), baseUrl).toString();
  } catch {
    return undefined;
  }
}

function likelyPropertyImage(url: string) {
  const lower = url.toLowerCase();
  if (!/^https?:/.test(lower)) return false;
  if (/logo|avatar|agent|profile|headshot|portrait|favicon|icon|sprite|placeholder|tracking|pixel/.test(lower)) {
    return false;
  }
  return /\.(?:jpe?g|png|webp|avif)(?:\?|$)/i.test(lower) || /image|photo|media|property|listing/.test(lower);
}

function extractImageUrls(html: string, baseUrl: string) {
  const candidates: string[] = [];

  for (const match of html.matchAll(/<meta\b[^>]*(?:property|name)\s*=\s*(["'])(?:og:image|twitter:image)[^"']*\1[^>]*content\s*=\s*(["'])(.*?)\2[^>]*>/gi)) {
    candidates.push(match[3]);
  }
  for (const match of html.matchAll(/<meta\b[^>]*content\s*=\s*(["'])(.*?)\1[^>]*(?:property|name)\s*=\s*(["'])(?:og:image|twitter:image)[^"']*\3[^>]*>/gi)) {
    candidates.push(match[2]);
  }
  for (const match of html.matchAll(/<img\b[^>]*(?:src|data-src|data-lazy-src)\s*=\s*(["'])(.*?)\1[^>]*>/gi)) {
    candidates.push(match[2]);
  }
  for (const match of html.matchAll(/"(?:image|imageUrl|photoUrl)"\s*:\s*"([^"]+)"/gi)) {
    candidates.push(match[1]);
  }

  const unique = new Set<string>();
  for (const candidate of candidates) {
    const url = absoluteMediaUrl(candidate, baseUrl);
    if (!url || !likelyPropertyImage(url)) continue;
    unique.add(url);
    if (unique.size >= 10) break;
  }

  return [...unique];
}

function extractParking(text: string) {
  const match = text.match(/\b(\d+)\s*(?:car\s*parks?|carparks?|parking\s*spaces?|garage\s*spaces?|garages?)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractPropertyType(text: string) {
  const explicit = text.match(/\bProperty Type\s*[:\-]?\s*(House|Apartment|Unit|Townhouse|Studio|Flat)\b/i)?.[1];
  if (explicit) return explicit[0].toUpperCase() + explicit.slice(1).toLowerCase();

  const generic = text.match(/\b(House|Apartment|Unit|Townhouse|Studio|Flat)\s+(?:for rent|to rent|rental)\b/i)?.[1];
  return generic ? generic[0].toUpperCase() + generic.slice(1).toLowerCase() : undefined;
}

function extractFeatures(text: string) {
  const featureRules: Array<[string, RegExp]> = [
    ["Heat pump", /\bheat\s*pump\b/i],
    ["Garage", /\bgarage|garaging\b/i],
    ["Off-street parking", /\boff[- ]street\s+parking\b/i],
    ["Furnished", /\b(?:fully\s+)?furnished\b/i],
    ["Dishwasher", /\bdishwasher\b/i],
    ["Garden", /\bgarden\b/i],
    ["Courtyard", /\bcourtyard\b/i],
    ["Deck", /\bdeck\b/i],
    ["Balcony", /\bbalcony\b/i],
    ["Double glazing", /\bdouble\s+glaz/i],
    ["Pets negotiable", /\bpets?\s+(?:negotiable|considered)\b/i],
    ["Pets allowed", /\bpets?\s+allowed\b/i],
  ];

  return featureRules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label).slice(0, 8);
}

async function fetchListingHtml(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-NZ,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; BlenheimRentals/1.0; +https://github.com/Archil3s/Blenheim-rentals)",
    },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) throw new Error(`Listing returned HTTP ${response.status}`);
  return response.text();
}

async function enrichOne(rental: Rental): Promise<Rental> {
  if (!rental.url) return rental;

  const shouldFetch =
    isGenericName(rental.contactName, rental) ||
    isPlaceholder(rental.contactPhone) ||
    isPlaceholder(rental.contactEmail) ||
    !rental.imageUrls?.length ||
    !rental.features?.length ||
    rental.parking == null;

  if (!shouldFetch) return rental;

  try {
    const html = await fetchListingHtml(rental.url);
    const plain = textFromHtml(html);
    const scope = contactScope(rental, plain);
    const phone = choosePhone(scope, html);
    const email = firstMailto(html) || firstEmail(scope) || firstEmail(plain);
    const contactName =
      contactNameFromText(scope) ||
      (phone ? lastPersonBefore(scope, phone) : undefined) ||
      contactNameFromText(plain) ||
      (isGenericName(rental.contactName, rental) ? undefined : rental.contactName);
    const imageUrls = extractImageUrls(html, rental.url);
    const features = extractFeatures(plain);
    const parking = rental.parking ?? extractParking(plain);
    const propertyType = rental.propertyType || extractPropertyType(plain);

    return {
      ...rental,
      imageUrl: rental.imageUrl || imageUrls[0],
      imageUrls: imageUrls.length ? imageUrls : rental.imageUrls,
      features: features.length ? [...new Set([...(rental.features ?? []), ...features])] : rental.features,
      parking,
      propertyType,
      contactName: contactName || rental.contactName,
      propertyManager: contactName || rental.propertyManager,
      contactPhone: phone || rental.contactPhone,
      contactEmail: email || rental.contactEmail,
    };
  } catch {
    return rental;
  }
}

export async function enrichRentalContacts(rentals: Rental[]) {
  const enriched: Rental[] = [];
  const batchSize = 20;

  for (let index = 0; index < rentals.length; index += batchSize) {
    const batch = rentals.slice(index, index + batchSize);
    enriched.push(...(await Promise.all(batch.map(enrichOne))));
  }

  return enriched;
}
