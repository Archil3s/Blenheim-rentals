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
    /property|management|rentals?|office|team|enquir|contact|agent|additional details|property id|listed on|updated|real estate|marlborough district|website/i.test(
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
      `\\b(${PERSON})\\s+(?:(?:Blenheim|Picton|Marlborough)\\s+)?(?:Area Manager|Property Manager|Rentals? Manager|Leasing Agent)\\b`,
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
    isPlaceholder(rental.contactEmail);

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

    return {
      ...rental,
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
