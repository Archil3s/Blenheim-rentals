import type { GroceryListing } from "./types";

const BASKT_API = "https://baskt.nz/api/v1";

type BasktItem = {
  id: string;
  chain?: string | null;
  name?: string | null;
  brand?: string | null;
  packSize?: string | null;
  category?: string | null;
};

type BasktPrice = {
  itemId: string;
  locationId: string;
  priceCents?: number | null;
  unitPriceCents?: number | null;
  unitMeasure?: string | null;
  promoFlag?: boolean | null;
  promoLabel?: string | null;
  observedAt?: string | null;
};

type BasktLocation = {
  id: string;
  chain?: string | null;
  slug?: string | null;
  name?: string | null;
  region?: string | null;
  address?: string | null;
  active?: boolean | null;
};

type ItemsResponse = {
  data?: {
    items?: BasktItem[];
    latestPrices?: BasktPrice[];
  };
};

type LocationsResponse = {
  data?: {
    locations?: BasktLocation[];
    pagination?: {
      nextOffset?: number | null;
    };
  };
};

function chainLabel(value?: string | null) {
  const key = (value ?? "").toLowerCase();
  const labels: Record<string, string> = {
    countdown: "Woolworths",
    woolworths: "Woolworths",
    paknsave: "PAK'nSAVE",
    "pak'n'save": "PAK'nSAVE",
    newworld: "New World",
    "new-world": "New World",
    freshchoice: "Fresh Choice",
    "fresh-choice": "Fresh Choice",
    supervalue: "SuperValue",
    farro: "Farro",
    thewarehouse: "The Warehouse",
    "the-warehouse": "The Warehouse",
  };
  return labels[key] ?? value ?? "Supermarket";
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Blenheim-Price-Finder/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Baskt returned ${response.status}: ${body.slice(0, 180)}`);
  }

  return (await response.json()) as T;
}

async function fetchLocations() {
  const locations: BasktLocation[] = [];
  let offset = 0;

  for (let page = 0; page < 4; page += 1) {
    const url = new URL(`${BASKT_API}/locations`);
    url.searchParams.set("countryCode", "NZ");
    url.searchParams.set("vertical", "GROCERY");
    url.searchParams.set("active", "true");
    url.searchParams.set("limit", "250");
    url.searchParams.set("offset", String(offset));

    const payload = await fetchJson<LocationsResponse>(url);
    const batch = payload.data?.locations ?? [];
    locations.push(...batch);

    const nextOffset = payload.data?.pagination?.nextOffset;
    if (nextOffset == null || batch.length === 0) break;
    offset = nextOffset;
  }

  return locations;
}

function locationMatches(store: BasktLocation, requested: string) {
  const haystack = [store.name, store.region, store.address, store.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const target = requested.trim().toLowerCase();
  if (!target) return true;

  if (target === "blenheim") {
    return ["blenheim", "springlands", "redwoodtown"].some((term) => haystack.includes(term));
  }

  if (target === "marlborough") {
    return ["marlborough", "blenheim", "springlands", "redwoodtown", "renwick", "picton"].some((term) => haystack.includes(term));
  }

  return haystack.includes(target);
}

async function resolveLocations(location: string) {
  const allLocations = await fetchLocations();
  const selectedLocations = allLocations.filter((store) => locationMatches(store, location));

  if (selectedLocations.length === 0) {
    throw new Error(`Baskt has no grocery locations matching ${location}.`);
  }

  return selectedLocations;
}

async function fetchListingsForQuery(query: string, selectedLocations: BasktLocation[]) {
  const selectedIds = new Set(selectedLocations.map((store) => store.id));
  const locationById = new Map(selectedLocations.map((store) => [store.id, store]));

  const url = new URL(`${BASKT_API}/items`);
  if (query.trim()) url.searchParams.set("q", query.trim());
  url.searchParams.set("countryCode", "NZ");
  url.searchParams.set("vertical", "GROCERY");
  url.searchParams.set("locationId", [...selectedIds].join(","));
  url.searchParams.set("limit", "25");
  url.searchParams.set("offset", "0");

  const payload = await fetchJson<ItemsResponse>(url);
  const items = payload.data?.items ?? [];
  const prices = payload.data?.latestPrices ?? [];
  const itemById = new Map(items.map((item) => [item.id, item]));
  const listings: GroceryListing[] = [];

  for (const price of prices) {
    if (!selectedIds.has(price.locationId)) continue;
    if (typeof price.priceCents !== "number" || !Number.isFinite(price.priceCents)) continue;

    const item = itemById.get(price.itemId);
    if (!item?.name) continue;

    const store = locationById.get(price.locationId);
    const chain = chainLabel(store?.chain ?? item.chain);

    listings.push({
      id: `${item.id}-${price.locationId}`,
      name: item.name,
      brand: item.brand ?? null,
      size: item.packSize ?? null,
      category: item.category ?? null,
      chain,
      store: store?.name ?? chain,
      region: store?.region ?? null,
      price: price.priceCents / 100,
      unitPrice:
        typeof price.unitPriceCents === "number" && Number.isFinite(price.unitPriceCents)
          ? price.unitPriceCents / 100
          : null,
      unitLabel: price.unitMeasure ?? null,
      promo: price.promoLabel ?? (price.promoFlag ? "On promo" : null),
      imageUrl: null,
      sourceUrl: `https://baskt.nz/items/${item.id}`,
      observedAt: price.observedAt ?? null,
    });
  }

  return listings;
}

export async function fetchBasktGroceries(query: string, location: string) {
  const selectedLocations = await resolveLocations(location);
  const listings = await fetchListingsForQuery(query, selectedLocations);
  return listings.sort((a, b) => a.price - b.price);
}

export async function fetchBasktGroceriesMany(queries: string[], location: string) {
  const selectedLocations = await resolveLocations(location);
  const uniqueQueries = Array.from(new Set(queries.map((query) => query.trim()).filter(Boolean)));

  const batches = await Promise.all(
    uniqueQueries.map((query) => fetchListingsForQuery(query, selectedLocations)),
  );

  const merged = new Map<string, GroceryListing>();
  for (const item of batches.flat()) {
    const key = `${item.id}|${item.store}|${item.price}`;
    if (!merged.has(key)) merged.set(key, item);
  }

  return [...merged.values()].sort((a, b) => a.price - b.price);
}
