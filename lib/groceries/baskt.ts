import type { GroceryListing } from "./types";

const BASKT_MCP = "https://baskt.nz/api/mcp";
const PROTOCOL_VERSION = "2025-11-25";

type JsonObject = Record<string, unknown>;

type McpTool = {
  name?: string;
  inputSchema?: {
    properties?: Record<string, unknown>;
  };
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

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

function first(obj: JsonObject, keys: string[]) {
  for (const key of keys) {
    if (obj[key] != null) return obj[key];
  }
  return null;
}

function parseMcpPayload(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    const events = trimmed
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);

    for (let index = events.length - 1; index >= 0; index -= 1) {
      try {
        return JSON.parse(events[index]);
      } catch {
        // Continue looking for the most recent JSON event.
      }
    }
  }

  return null;
}

async function mcpRequest(body: JsonObject, sessionId?: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const response = await fetch(BASKT_MCP, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Baskt MCP returned ${response.status}: ${raw.slice(0, 180)}`);
  }

  return {
    payload: parseMcpPayload(raw),
    sessionId: response.headers.get("mcp-session-id") ?? sessionId ?? null,
  };
}

async function initialiseMcp() {
  const initial = await mcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: "blenheim-price-finder",
        version: "1.0.0",
      },
    },
  });

  await mcpRequest(
    {
      jsonrpc: "2.0",
      method: "notifications/initialized",
      params: {},
    },
    initial.sessionId,
  );

  return initial.sessionId;
}

function toolList(payload: unknown): McpTool[] {
  if (!isObject(payload)) return [];
  const result = isObject(payload.result) ? payload.result : null;
  return Array.isArray(result?.tools) ? (result.tools as McpTool[]) : [];
}

function pickProperty(properties: Record<string, unknown>, candidates: string[]) {
  return candidates.find((candidate) => Object.prototype.hasOwnProperty.call(properties, candidate));
}

function buildSearchArguments(tool: McpTool, query: string, location: string) {
  const properties = tool.inputSchema?.properties ?? {};
  const args: Record<string, unknown> = {};

  const queryKey = pickProperty(properties, ["query", "q", "search", "term", "item", "name"]);
  if (queryKey && query.trim()) args[queryKey] = query.trim();

  const locationKey = pickProperty(properties, ["location", "region", "city", "area"]);
  if (locationKey && location.trim()) args[locationKey] = location.trim();

  const verticalKey = pickProperty(properties, ["vertical", "type"]);
  if (verticalKey) args[verticalKey] = "grocery";

  const limitKey = pickProperty(properties, ["limit", "count", "top_k", "topK", "max_results"]);
  if (limitKey) args[limitKey] = 100;

  return args;
}

function unwrapToolContent(payload: unknown): unknown {
  if (!isObject(payload)) return payload;
  const result = isObject(payload.result) ? payload.result : payload;

  if (Array.isArray(result.content)) {
    for (const entry of result.content) {
      if (!isObject(entry)) continue;
      if (entry.structuredContent != null) return entry.structuredContent;
      if (entry.json != null) return entry.json;
      const value = text(entry.text);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          // Keep looking for structured content.
        }
      }
    }
  }

  if (result.structuredContent != null) return result.structuredContent;
  return result;
}

function collectCandidateObjects(value: unknown, output: JsonObject[] = []): JsonObject[] {
  if (Array.isArray(value)) {
    for (const item of value) collectCandidateObjects(item, output);
    return output;
  }

  if (!isObject(value)) return output;

  const hasName = ["name", "product_name", "productName", "title"].some((key) => value[key] != null);
  const hasPrice = [
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
  ].some((key) => value[key] != null);

  if (hasName && hasPrice) output.push(value);

  for (const nested of Object.values(value)) {
    if (Array.isArray(nested) || isObject(nested)) collectCandidateObjects(nested, output);
  }

  return output;
}

function normaliseItem(item: JsonObject, index: number): GroceryListing | null {
  const name = text(first(item, ["name", "product_name", "productName", "title"]));
  const price = number(
    first(item, [
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
    ]),
  );
  if (!name || price == null) return null;

  const chain = text(first(item, ["chain", "retailer", "retailer_name", "retailerName", "banner", "supermarket"])) ?? "Supermarket";
  const store = text(first(item, ["store", "store_name", "storeName", "location_name", "locationName"])) ?? chain;
  const idValue = first(item, ["id", "item_id", "itemId", "sku", "gtin"]);
  const id = text(idValue) ?? `${chain}-${store}-${name}-${index}`;

  let promo: string | null = text(first(item, ["promo", "promotion", "special", "special_text", "specialText"]));
  if (!promo && first(item, ["on_promo", "onPromo", "is_promo", "isPromo"]) === true) promo = "On promo";

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
    unitPrice: number(first(item, ["unit_price", "unitPrice", "price_per_unit", "pricePerUnit", "normalized_price", "normalised_price"])),
    unitLabel: text(first(item, ["unit_label", "unitLabel", "unit", "price_unit", "priceUnit", "normalized_unit", "normalised_unit"])),
    promo,
    imageUrl: text(first(item, ["image_url", "imageUrl", "image", "thumbnail"])),
    sourceUrl: text(first(item, ["url", "source_url", "sourceUrl", "product_url", "productUrl"])),
    observedAt: text(first(item, ["observed_at", "observedAt", "checked_at", "checkedAt", "last_checked", "lastChecked"])),
  };
}

export async function fetchBasktGroceries(query: string, location: string) {
  const sessionId = await initialiseMcp();

  const listed = await mcpRequest(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    },
    sessionId,
  );

  const searchTool = toolList(listed.payload).find((tool) => tool.name === "search_items");
  if (!searchTool) throw new Error("Baskt search_items tool is unavailable.");

  const called = await mcpRequest(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "search_items",
        arguments: buildSearchArguments(searchTool, query, location),
      },
    },
    listed.sessionId,
  );

  const content = unwrapToolContent(called.payload);
  const candidates = collectCandidateObjects(content);
  const seen = new Set<string>();

  return candidates
    .map(normaliseItem)
    .filter((item): item is GroceryListing => item !== null)
    .filter((item) => {
      const key = `${item.id}|${item.store}|${item.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
