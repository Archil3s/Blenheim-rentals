import { fetchBasktGroceriesMany } from "./baskt";
import type { GroceryListing } from "./types";

export type KetoGroup = "all" | "meat" | "seafood" | "eggs" | "cheese" | "dairy" | "veg" | "nuts" | "fats";

const GROUP_TERMS: Record<Exclude<KetoGroup, "all">, string[]> = {
  meat: ["beef", "steak", "mince", "chicken", "lamb", "pork", "bacon"],
  seafood: ["salmon", "tuna", "sardine", "prawn", "fish"],
  eggs: ["eggs"],
  cheese: ["cheese", "cheddar", "mozzarella", "feta", "parmesan"],
  dairy: ["cream", "butter"],
  veg: ["avocado", "broccoli", "cauliflower", "spinach", "lettuce", "courgette", "zucchini", "mushroom", "cucumber", "cabbage", "asparagus"],
  nuts: ["almond", "macadamia", "walnut", "pecan", "chia", "flax"],
  fats: ["olive oil", "coconut oil", "avocado oil", "mayonnaise", "mayo"],
};

const ALL_TERMS = Array.from(new Set(Object.values(GROUP_TERMS).flat()));

const EXCLUDED_TERMS = [
  "bread",
  "cracker",
  "crackers",
  "biscuit",
  "cookie",
  "cake",
  "muffin",
  "cereal",
  "granola",
  "muesli",
  "rice",
  "pasta",
  "noodle",
  "flour",
  "sugar",
  "honey",
  "syrup",
  "jam",
  "jelly",
  "chocolate",
  "confectionery",
  "lolly",
  "lollies",
  "potato",
  "kumara",
  "corn",
  "pizza",
  "pie",
  "pastry",
  "crumbed",
  "breaded",
  "batter",
  "ice cream",
  "sweetened",
  "juice",
  "smoothie",
  "soft drink",
  "energy drink",
];

function searchable(item: GroceryListing) {
  return [item.name, item.brand, item.size, item.category].filter(Boolean).join(" ").toLowerCase();
}

function looksKeto(item: GroceryListing) {
  const value = searchable(item);
  return !EXCLUDED_TERMS.some((term) => value.includes(term));
}

export async function fetchKetoGroceries(location: string, group: KetoGroup = "all") {
  const terms = group === "all" ? ALL_TERMS : GROUP_TERMS[group];
  const listings = await fetchBasktGroceriesMany(terms, location);

  return listings
    .filter(looksKeto)
    .sort((a, b) => a.price - b.price);
}
