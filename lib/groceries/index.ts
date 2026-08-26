import { fetchBasktGroceries } from "./baskt";
import { fetchKetoGroceries, type KetoGroup } from "./keto";
import type { GroceryFeed } from "./types";

type GroceryFeedOptions = {
  mode?: "standard" | "keto";
  ketoGroup?: KetoGroup;
};

export async function getGroceryFeed(
  query = "",
  location = "Blenheim",
  options: GroceryFeedOptions = {},
): Promise<GroceryFeed> {
  const mode = options.mode ?? "standard";
  const ketoGroup = options.ketoGroup ?? "all";
  const listings =
    mode === "keto"
      ? await fetchKetoGroceries(location, ketoGroup, query)
      : await fetchBasktGroceries(query, location);

  return {
    listings,
    checkedAt: new Date().toISOString(),
    source: "Baskt",
    query: mode === "keto" ? `carnivore:${ketoGroup}:${query}` : query,
    location,
  };
}
