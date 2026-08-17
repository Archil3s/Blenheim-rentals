import type { Rental } from "./types";

export type RentPriceBand = {
  id: string;
  label: string;
  min: number;
  maxExclusive: number | null;
};

export const RENT_PRICE_BANDS: RentPriceBand[] = [
  { id: "300-350", label: "$300–$350", min: 300, maxExclusive: 350 },
  { id: "350-400", label: "$350–$400", min: 350, maxExclusive: 400 },
  { id: "400-450", label: "$400–$450", min: 400, maxExclusive: 450 },
  { id: "450-500", label: "$450–$500", min: 450, maxExclusive: 500 },
  { id: "500-550", label: "$500–$550", min: 500, maxExclusive: 550 },
  { id: "550-600", label: "$550–$600", min: 550, maxExclusive: 600 },
  { id: "600-650", label: "$600–$650", min: 600, maxExclusive: 650 },
  { id: "650-700", label: "$650–$700", min: 650, maxExclusive: 700 },
  { id: "700-plus", label: "$700+", min: 700, maxExclusive: null },
];

export function rentPriceBandFor(rent: number | null | undefined) {
  if (rent == null) return undefined;
  return RENT_PRICE_BANDS.find(
    (band) => rent >= band.min && (band.maxExclusive == null || rent < band.maxExclusive),
  );
}

export function priceBandCounts(rentals: Rental[]) {
  return RENT_PRICE_BANDS.map((band) => ({
    ...band,
    count: rentals.filter((rental) => rentPriceBandFor(rental.rent)?.id === band.id).length,
  }));
}

export function selectDiaryRentalsByPriceBand(rentals: Rental[], limit = 15) {
  const groups = new Map<string, Rental[]>();

  for (const band of RENT_PRICE_BANDS) groups.set(band.id, []);

  for (const rental of rentals) {
    const band = rentPriceBandFor(rental.rent);
    if (!band) continue;
    groups.get(band.id)?.push(rental);
  }

  for (const group of groups.values()) {
    group.sort(
      (a, b) =>
        (a.rent ?? Number.MAX_SAFE_INTEGER) - (b.rent ?? Number.MAX_SAFE_INTEGER) ||
        a.address.localeCompare(b.address),
    );
  }

  const selected: Rental[] = [];
  let round = 0;

  while (selected.length < limit) {
    let addedThisRound = false;

    for (const band of RENT_PRICE_BANDS) {
      const rental = groups.get(band.id)?.[round];
      if (!rental) continue;

      selected.push(rental);
      addedThisRound = true;
      if (selected.length >= limit) break;
    }

    if (!addedThisRound) break;
    round += 1;
  }

  return selected;
}
