import type { Rental } from "./types";

function normalisePart(value: string) {
  return value
    .toLowerCase()
    .replace(/\//g, " unit ")
    .replace(/\bstreet\b/g, "st")
    .replace(/\broad\b/g, "rd")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bplace\b/g, "pl")
    .replace(/\bcrescent\b/g, "cres")
    .replace(/\bterrace\b/g, "tce")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalLocality(value?: string) {
  const text = normalisePart(value ?? "");
  if (!text || /^\d+$/.test(text) || text === "marlborough district") {
    return "";
  }
  if (text === "blenheim central" || text === "blenheim") return "blenheim";
  return text;
}

function keyFor(rental: Rental) {
  const parts = rental.address.split(",").map((part) => part.trim()).filter(Boolean);
  const street = normalisePart(parts[0] ?? rental.address);
  const locality =
    canonicalLocality(parts[1]) ||
    canonicalLocality(rental.suburb) ||
    canonicalLocality(rental.area) ||
    canonicalLocality(rental.region);
  const region = canonicalLocality(rental.region) || "unknown-region";

  if (street) {
    return `address:${region}:${street}:${locality}`;
  }

  return `source:${rental.source}:${rental.sourceListingId ?? rental.url}`;
}

function usefulContact(value?: string) {
  const text = value?.trim().toLowerCase() ?? "";
  return Boolean(
    text &&
      !text.startsWith("see original") &&
      text !== "website" &&
      text !== "website listing" &&
      text !== "online listing" &&
      text !== "not provided",
  );
}

function namedPerson(value: string | undefined, rental: Rental) {
  if (!usefulContact(value)) return false;
  const text = value!.trim().toLowerCase();
  return (
    text !== rental.source.toLowerCase() &&
    !text.includes("property management team") &&
    !text.endsWith("property management") &&
    text !== "oneroof" &&
    text !== "quinovic blenheim" &&
    text !== "ray white blenheim"
  );
}

function richness(rental: Rental) {
  return (
    (rental.imageUrl ? 4 : 0) +
    ((rental.imageUrls?.length ?? 0) > 1 ? 3 : 0) +
    ((rental.features?.length ?? 0) > 0 ? 2 : 0) +
    (rental.bathrooms != null ? 1 : 0) +
    (rental.bedrooms != null ? 1 : 0) +
    (rental.parking != null ? 1 : 0) +
    (rental.suburb ? 1 : 0) +
    (rental.area ? 1 : 0) +
    (namedPerson(rental.contactName, rental) ? 5 : 0) +
    (namedPerson(rental.propertyManager, rental) ? 3 : 0) +
    (usefulContact(rental.contactPhone) ? 2 : 0) +
    (usefulContact(rental.contactEmail) ? 2 : 0)
  );
}

function chooseUseful(primary?: string, secondary?: string) {
  if (usefulContact(primary)) return primary;
  if (usefulContact(secondary)) return secondary;
  return primary || secondary;
}

function chooseName(primary: Rental, secondary: Rental) {
  if (namedPerson(primary.contactName, primary)) return primary.contactName;
  if (namedPerson(secondary.contactName, secondary)) return secondary.contactName;
  return primary.contactName || secondary.contactName;
}

function mergeRentals(a: Rental, b: Rental) {
  const aRicher = richness(a) >= richness(b);
  const primary = aRicher ? a : b;
  const secondary = aRicher ? b : a;
  const contactName = chooseName(primary, secondary);
  const imageUrls = [...new Set([
    ...(primary.imageUrls ?? (primary.imageUrl ? [primary.imageUrl] : [])),
    ...(secondary.imageUrls ?? (secondary.imageUrl ? [secondary.imageUrl] : [])),
  ])].slice(0, 10);
  const features = [...new Set([...(primary.features ?? []), ...(secondary.features ?? [])])].slice(0, 10);

  return {
    ...secondary,
    ...primary,
    imageUrl: primary.imageUrl || secondary.imageUrl || imageUrls[0],
    imageUrls: imageUrls.length ? imageUrls : undefined,
    features: features.length ? features : undefined,
    bedrooms: primary.bedrooms ?? secondary.bedrooms,
    bathrooms: primary.bathrooms ?? secondary.bathrooms,
    parking: primary.parking ?? secondary.parking,
    suburb: primary.suburb || secondary.suburb,
    area: primary.area || secondary.area,
    region: primary.region || secondary.region,
    contactName,
    propertyManager:
      (contactName && namedPerson(contactName, primary) ? contactName : undefined) ||
      chooseUseful(primary.propertyManager, secondary.propertyManager) ||
      primary.source,
    contactPhone: chooseUseful(primary.contactPhone, secondary.contactPhone),
    contactEmail: chooseUseful(primary.contactEmail, secondary.contactEmail),
    notes: primary.notes || secondary.notes,
    outcome: primary.outcome || secondary.outcome,
    followUpAction: primary.followUpAction || secondary.followUpAction,
  } satisfies Rental;
}

export function deduplicateRentals(rentals: Rental[]) {
  const unique = new Map<string, Rental>();

  for (const rental of rentals) {
    const key = keyFor(rental);
    const existing = unique.get(key);
    unique.set(key, existing ? mergeRentals(existing, rental) : rental);
  }

  return [...unique.values()];
}
