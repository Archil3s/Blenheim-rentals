import type { Rental } from "./types";

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
  return !text || text === "see original listing" || text === "not provided";
}

function isGenericName(value: string | undefined, rental: Rental) {
  const text = compact(value).toLowerCase();
  if (!text) return true;
  const source = rental.source.toLowerCase();
  return (
    text === source ||
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
    .find((email) => !/privacy|support|webmaster|noreply|no-reply/i.test(email));
}

function firstEmail(text: string) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  return matches.find((email) => !/privacy|support|webmaster|noreply|no-reply/i.test(email));
}

function firstTel(html: string) {
  const matches = [...html.matchAll(/href\s*=\s*(["'])tel:([^"']+)\1/gi)];
  return matches
    .map((match) => decodeHtml(match[2]).replace(/\s+/g, " ").trim())
    .find((phone) => /(?:\+64|0)\s?\d/.test(phone));
}

function firstNzPhone(text: string) {
  const mobile = text.match(/(?:\+64\s?2\d|\b02\d)(?:[\s-]?\d){6,8}\b/);
  if (mobile) return mobile[0].replace(/\s+/g, " ");

  const landline = text.match(/(?:\+64\s?[3-9]|\b0[3-9])(?:[\s-]?\d){7,8}\b/);
  return landline?.[0]?.replace(/\s+/g, " ");
}

function plausiblePerson(value: string | undefined) {
  if (!value) return undefined;
  const name = value.replace(/\s+/g, " ").trim();
  if (name.length < 5 || name.length > 60) return undefined;
  if (/property|management|rentals?|office|team|enquir|contact|agent$/i.test(name)) return undefined;
  if (!/^[A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}$/.test(name)) return undefined;
  return name;
}

function contactNameFromText(text: string) {
  const patterns = [
    /\bProperty Manager\s*[:\-]?\s*([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})/,
    /\bRentals? Manager\s*[:\-]?\s*([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})/,
    /\bLeasing Agent\s*[:\-]?\s*([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})/,
    /\bListed by\s+([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})/,
    /\bContact\s+([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})\s+(?:on|at)\b/,
    /\bAgent\s*[:\-]?\s*([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3})/,
  ];

  for (const pattern of patterns) {
    const candidate = plausiblePerson(text.match(pattern)?.[1]);
    if (candidate) return candidate;
  }
  return undefined;
}

function contactNameNearLink(html: string, email?: string, phone?: string) {
  const needle = email || phone;
  if (!needle) return undefined;
  const index = html.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return undefined;
  const context = textFromHtml(
    html.slice(Math.max(0, index - 600), Math.min(html.length, index + 350)),
  );
  return contactNameFromText(context);
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
    const email = firstMailto(html) || firstEmail(plain);
    const phone = firstTel(html) || firstNzPhone(plain);
    const contactName =
      contactNameNearLink(html, email, phone) ||
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
