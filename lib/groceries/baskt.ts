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

function first(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (obj[key] != null) return obj[key];
  }
  return null;
}

function normaliseItem(raw: unknown, index: number): GroceryListing | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  const name = text(first(item, ["name", "product_name", "productName", "title"]));
  const price = number(first(item, ["price", "current_price", "currentPrice", "latest_price", "latestPrice"]));
  if (!name || price == null) return null;

  const chain = text(first(item, ["chain", "retailer", "banner", "supermarket"])) ?? "Supermarket";
  const store = text(first(item, ["store", "store_name", "storeName", "location_name", "locationName"])) ?? chain;
  const idValue = first(item, ["id", "item_id", "itemId", "sku", "gtin"]);
  const id = text(idValue) ?? `${chain}-${store}-${name}-${index}`;

  return {
    id,
    name,
    brand: text(first(item, ["brand", "brand_name", "brandName"])),
    size: text(first(item, ["size", "pack_size", "packSize", "package_size", "packageSize"])),
    category: text(first(item, ["category", "category_name", "categoryName", "department"])),
    chain,
    store,
    region: text(first(item, ["region", "area", "city"])),
    price,
    unitPrice: number(first(item, ["unit_price", "unitPrice", "price_per_unit", "pricePerUnit"])),
    unitLabel: text(first(item, ["unit_label", "unitLabel", "unit", "price_unit", "priceUnit"])),
    promo: text(first(item, ["promo", "promotion", "special", "special_text", "specialText"])),
    imageUrl: text(first(item, ["image_url", "imageUrl", "image", "thumbnail"])),
    sourceUrl: text(first(item, ["url", "source_url", "sourceUrl", "product_url", "productUrl"])),
    observedAt: text(first(item, ["observed_at", "observedAt", "checked_at", "checkedAt", "last_checked", "lastChecked"])),
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
    for (const key of ["items", "results", "products"]) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
    }
  }

  return [];
}

export async function fetchBasktGroceries(query: string, location: string) {
  const params = new URLSearchParams({
    vertical: "grocery",
    region: location,
    limit: "120",
  });
  if (query.trim()) params.set("q", query.trim());

  const response = await fetch(`${BASKT_API}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Blenheim-Rentals-Grocery-Comparison/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Baskt returned ${response.status}`);
  }

  const payload: unknown = await response.json();
  return extractItems(payload)
    .map(normaliseItem)
    .filter((item): item is GroceryListing => item !== null);
}
