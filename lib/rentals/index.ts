import { enrichRentalContacts } from "./contact-enrichment";
import { deduplicateRentals } from "./deduplicate";
import { rentalSources } from "./sources";
import type { Rental, RentalFeed, SourceStatus } from "./types";

function cleanRental(rental: Rental, checkedAt: string): Rental {
  const propertyManager = rental.propertyManager?.trim() || rental.source;

  return {
    ...rental,
    address: rental.address.trim(),
    suburb: rental.suburb?.trim() || undefined,
    area: rental.area?.trim() || undefined,
    rent: rental.rent != null && rental.rent > 0 ? Math.round(rental.rent) : null,
    bedrooms: rental.bedrooms != null && rental.bedrooms >= 0 ? rental.bedrooms : null,
    bathrooms: rental.bathrooms != null && rental.bathrooms >= 0 ? rental.bathrooms : null,
    checkedAt,
    contactType: rental.contactType?.trim() || "Online",
    propertyType: rental.propertyType?.trim() || "Private rental",
    propertyManager,
    contactName: rental.contactName?.trim() || undefined,
    contactPhone: rental.contactPhone?.trim() || "See original listing",
    contactEmail: rental.contactEmail?.trim() || "See original listing",
    notes: rental.notes?.trim() || "Current online rental listing.",
    outcome: rental.outcome?.trim() || "Available at last check",
    followUpAction:
      rental.followUpAction?.trim() || "Open listing and contact property manager",
    rating: rental.rating ?? null,
  };
}

export async function getRentalFeed(): Promise<RentalFeed> {
  const checkedAt = new Date().toISOString();
  const enabledSources = rentalSources.filter((source) => source.enabled);

  const results = await Promise.all(
    enabledSources.map(async (source) => {
      try {
        const rentals = (await source.fetchRentals()).map((rental) =>
          cleanRental(rental, checkedAt),
        );
        return {
          source: source.name,
          ok: true as const,
          rentals,
        };
      } catch (error) {
        console.error(`Rental source failed: ${source.name}`, error);
        return {
          source: source.name,
          ok: false as const,
          rentals: [] as Rental[],
        };
      }
    }),
  );

  const statuses: SourceStatus[] = rentalSources.map((source) => {
    if (!source.enabled) {
      return {
        source: source.name,
        configured: false,
        ok: false,
        count: 0,
      };
    }

    const result = results.find((item) => item.source === source.name);

    return {
      source: source.name,
      configured: true,
      ok: result?.ok ?? false,
      count: result?.rentals.length ?? 0,
      ...(!result?.ok ? { error: "Source could not be refreshed" } : {}),
    };
  });

  const deduplicated = deduplicateRentals(results.flatMap((result) => result.rentals));
  const rentals = (await enrichRentalContacts(deduplicated)).sort(
    (a, b) => (a.rent ?? Number.MAX_SAFE_INTEGER) - (b.rent ?? Number.MAX_SAFE_INTEGER),
  );

  return {
    rentals,
    total: rentals.length,
    checkedAt,
    sources: statuses,
  };
}
