import type { Rental } from "./types";

function normaliseAddress(address: string) {
  return address
    .toLowerCase()
    .replace(/\//g, " unit ")
    .replace(/\bstreet\b/g, "st")
    .replace(/\broad\b/g, "rd")
    .replace(/\bavenue\b/g, "ave")
    .replace(/\bdrive\b/g, "dr")
    .replace(/\bplace\b/g, "pl")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keyFor(rental: Rental) {
  const address = normaliseAddress(rental.address);

  if (address) {
    return `address:${address}`;
  }

  return `source:${rental.source}:${rental.sourceListingId ?? rental.url}`;
}

function usefulContact(value?: string) {
  return Boolean(value && !value.toLowerCase().startsWith("see original"));
}

function richness(rental: Rental) {
  const namedManager =
    rental.propertyManager &&
    rental.propertyManager.toLowerCase() !== rental.source.toLowerCase();

  return (
    (rental.imageUrl ? 4 : 0) +
    (rental.bathrooms != null ? 1 : 0) +
    (rental.bedrooms != null ? 1 : 0) +
    (rental.suburb ? 1 : 0) +
    (rental.area ? 1 : 0) +
    (namedManager ? 3 : 0) +
    (usefulContact(rental.contactPhone) ? 1 : 0) +
    (usefulContact(rental.contactEmail) ? 1 : 0)
  );
}

export function deduplicateRentals(rentals: Rental[]) {
  const unique = new Map<string, Rental>();

  for (const rental of rentals) {
    const key = keyFor(rental);
    const existing = unique.get(key);

    if (!existing || richness(rental) > richness(existing)) {
      unique.set(key, rental);
    }
  }

  return [...unique.values()];
}
