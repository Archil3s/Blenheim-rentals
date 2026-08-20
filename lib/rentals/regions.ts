export const RENTAL_REGIONS = [
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
] as const;

export type RentalRegionName = (typeof RENTAL_REGIONS)[number]["name"];

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
