async function json(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${url}: ${body.slice(0, 300)}`);
  return JSON.parse(body);
}

const locations = [];
let offset = 0;
for (let page = 0; page < 4; page += 1) {
  const url = new URL("https://baskt.nz/api/v1/locations");
  url.searchParams.set("countryCode", "NZ");
  url.searchParams.set("vertical", "GROCERY");
  url.searchParams.set("active", "true");
  url.searchParams.set("limit", "250");
  url.searchParams.set("offset", String(offset));
  const payload = await json(url);
  const batch = payload.data?.locations ?? [];
  locations.push(...batch);
  const next = payload.data?.pagination?.nextOffset;
  if (next == null || batch.length === 0) break;
  offset = next;
}

const blenheim = locations.filter((store) => {
  const haystack = [store.name, store.region, store.address, store.slug].filter(Boolean).join(" ").toLowerCase();
  return ["blenheim", "springlands", "redwoodtown"].some((term) => haystack.includes(term));
});

console.log("BLENHEIM LOCATIONS");
console.log(JSON.stringify(blenheim, null, 2));

if (!blenheim.length) throw new Error("No Blenheim locations found");

const itemsUrl = new URL("https://baskt.nz/api/v1/items");
itemsUrl.searchParams.set("q", "cheese");
itemsUrl.searchParams.set("countryCode", "NZ");
itemsUrl.searchParams.set("vertical", "GROCERY");
itemsUrl.searchParams.set("locationId", blenheim.map((store) => store.id).join(","));
itemsUrl.searchParams.set("limit", "10");

const itemsPayload = await json(itemsUrl);
const items = itemsPayload.data?.items ?? [];
const prices = itemsPayload.data?.latestPrices ?? [];
const ids = new Set(blenheim.map((store) => store.id));
const localPrices = prices.filter((price) => ids.has(price.locationId));

console.log("BLENHEIM CHEESE ITEMS", items.length);
console.log("BLENHEIM CHEESE LOCAL PRICE ROWS", localPrices.length);
console.log(JSON.stringify({ items: items.slice(0, 5), prices: localPrices.slice(0, 10) }, null, 2));

if (!items.length || !localPrices.length) throw new Error("Baskt returned no Blenheim cheese prices");
