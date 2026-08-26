import { fetchBasktGroceries } from "./baskt";
import type { GroceryFeed } from "./types";

export async function getGroceryFeed(query = "", location = "Blenheim"): Promise<GroceryFeed> {
  const listings = await fetchBasktGroceries(query, location);

  return {
    listings,
    checkedAt: new Date().toISOString(),
    source: "Baskt",
    query,
    location,
  };
}
