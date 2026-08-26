import type { GroceryListing } from "./types";

const BASKT_API = "https://baskt.nz/api/v1/items";

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function first(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (obj[key] != null) return obj[key];
  }
  return null;
}

function candidateObjects(item: Record<string, unknown>) {
  return [
    item,
    object(item.cheapest),
    object(item.latest),
    object(item.price),
    object(item.latest_price),
    object(item.latestPrice),
    object(item.best_price),
    object(item.bestPrice),
    object(item.store_price),
    object(item.storePrice),
  ].filter((value): value is Record<string, unknown> => Boolean(value));
}

function firstFromCandidates(
  candidates: Record<string, unknown>[],
  keys: string[],
): unknown {
  for (const candidate of candidates) {
    const value = first(candidate, keys);
    if (value != null) return value;
  }
  return null;
}

function normaliseItem(raw: unknown, index: number): GroceryListing | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const candidates = candidateObjects(item);

  const name = text(
    firstFromCandidates(candidates, [
      "name",
      "product_name",
      "productName",
      "title",
      "display_name",
      "displayName",
    ]),
  );

  const price = number(
    firstFromCandidates(candidates, [
      "price",
      "current_price",
      "currentPrice",
      "latest_price",
      "latestPrice",
      "min_price",
      "minPrice",
      "lowest_price",
      "lowestPrice",
      "cheapest_price",
      "cheapestPrice",
      "best_price",
      "bestPrice",
      "amount",
    ]),
  );

  if (!name || price == null) return null;

  const chain =
    text(
      firstFromCandidates(candidates, [
        "chain",
        "chain_name",
        "chainName",
        "retailer",
        "retailer_name",
        "retailerName",
        "banner",
        "supermarket",
      ]),
    ) ?? "Supermarket";

  const store =
    text(
      firstFromCandidates(candidates, [
        "store",
        "store_name",
        "storeName",
        "location_name",
        "locationName",
        "location",
      ]),
    ) ?? chain;

  const idValue = firstFromCandidates(candidates, [
    "id",
    "item_id",
    "itemId",
    "sku",
    "gtin",
  ]);
  const id = text(idValue) ?? String(idValue ?? `${chain}-${store}-${name}-${index}`);

  return {
    id,
    name,
    brand: text(firstFromCandidates(candidates, ["brand", "brand_name", "brandName"])),
    size: text(
      firstFromCandidates(candidates, [
        "size",
        "pack_size",
        "packSize",
        "package_size",
        "packageSize",
        "quantity",
      ]),
    ),
    category: text(
      firstFromCandidates(candidates, [
        "category",
        "category_name",
        "categoryName",
        "department",
        "category_path",
        "categoryPath",
      ]),
    ),
    chain,
    store,
    region: text(firstFromCandidates(candidates, ["region", "area", "city"])),
    price,
    unitPrice: number(
      firstFromCandidates(candidates, [
        "unit_price",
        "unitPrice",
        "price_per_unit",
        "pricePerUnit",
        "normalized_price",
        "normalised_price",
        "normalizedPrice",
      ]),
    ),
    unitLabel: text(
      firstFromCandidates(candidates, [
        "unit_label",
        "unitLabel",
        "unit",
        "price_unit",
        "priceUnit",
        "normalized_unit",
        "normalised_unit",
      ]),
    ),
    promo: text(
      firstFromCandidates(candidates, [
        "promo",
        "promotion",
        "special",
        "special_text",
        "specialText",
        "promo_text",
        "promoText",
      ]),
    ),
    imageUrl: text(
      firstFromCandidates(candidates, [
        "image_url",
        "imageUrl",
        "image",
        "thumbnail",
        "thumbnail_url",
        "thumbnailUrl",
      ]),
    ),
    sourceUrl: text(
      firstFromCandidates(candidates, [
        "url",
        "source_url",
        "sourceUrl",
        "product_url",
        "productUrl",
        "item_url",
        "itemUrl",
      ]),
    ),
    observedAt: text(
      firstFromCandidates(candidates, [
        "observed_at",
        "observedAt",
        "checked_at",
        "checkedAt",
        "last_checked",
        "lastChecked",
        "updated_at",
        "updatedAt",
      ]),
    ),
  };
}

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const data = payload as Record<string, unknown>;
  for (const key of ["items", "results", "products", "data"]) {
    if (Array.isArray(data[key])) return data[key] as unknown[];
  }

  if (data.data && typeof data.data === "object") {
    const nested = data.data as Record<string, unknown>;
    for (const key of ["items", "results", "products", "data"]) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
    }
  }

  return [];
}

export async function fetchBasktGroceries(query: string, location: string) {
  const params = new URLSearchParams({
    limit: "100",
  });

  if (query.trim()) params.set("q", query.trim());
  if (location.trim()) params.set("location", location.trim());

  const response = await fetch(`${BASKT_API}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Blenheim-Rentals-Grocery-Comparison/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Baskt returned ${response.status}${detail ? `: ${detail.slice(0, 180)}` : ""}`);
  }

  const payload: unknown = await response.json();
  return extractItems(payload)
    .map(normaliseItem)
    .filter((item): item is GroceryListing => item !== null);
}
