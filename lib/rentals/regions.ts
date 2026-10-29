const RENTAL_REGION_DEFINITIONS = [
  { name: "Marlborough", slug: "marlborough" },
  { name: "Nelson", slug: "nelson" },
  { name: "Kaikōura", slug: "kaikoura" },
  { name: "Christchurch", slug: "christchurch" },
  { name: "Wellington", slug: "wellington" },
  { name: "Dunedin", slug: "dunedin" },
  { name: "Invercargill", slug: "invercargill" },
  { name: "Timaru", slug: "timaru" },
  { name: "Queenstown-Lakes", slug: "queenstown-lakes" },
  { name: "Ashburton", slug: "ashburton" },
  { name: "Tauranga", slug: "tauranga" },
  { name: "Mount Maunganui", slug: "mount-maunganui" },
  { name: "Arataki", slug: "arataki" },
  { name: "Pāpāmoa Beach", slug: "papamoa-beach" },
  { name: "Ōtūmoetai", slug: "otumoetai" },
] as const;

export type RentalRegionName = (typeof RENTAL_REGION_DEFINITIONS)[number]["name"];

// Export a widened read-only view so callers that compare discovered string
// regions (for example CSV export code) can use Array.includes safely while
// RentalRegionName above still retains the exact region-name union.
export const RENTAL_REGIONS: readonly { name: string; slug: string }[] = RENTAL_REGION_DEFINITIONS;

export function rentalRegionBySlug(slug: string) {
  return RENTAL_REGIONS.find((region) => region.slug === slug.toLowerCase());
}

export function rentalRegionSlug(name?: string) {
  const known = RENTAL_REGIONS.find(
    (region) => region.name.toLowerCase() === (name ?? "").toLowerCase(),
  );

  if (known) return known.slug;

  return (name ?? "marlborough")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
