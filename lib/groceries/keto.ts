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

// Reject products that can match food search words but are not intended for people.
const NON_HUMAN_FOOD_TERMS = [
  "dog food",
  "cat food",
  "pet food",
  "dog treat",
  "dog treats",
  "cat treat",
  "cat treats",
  "pet treat",
  "pet treats",
  "puppy food",
  "kitten food",
  "puppy treat",
  "kitten treat",
  "canine",
  "feline",
  "dog chew",
  "dental chew",
  "dog roll",
  "cat litter",
  "pet milk",
  "bird food",
  "bird seed",
  "fish food",
  "animal feed",
  "pet mince",
  "raw pet",
];

// Grocery catalogues can contain household, personal-care and health products.
const NON_FOOD_CATEGORY_TERMS = [
  "pet",
  "pets",
  "pet care",
  "animal care",
  "household",
  "cleaning",
  "laundry",
  "personal care",
  "health & beauty",
  "health and beauty",
  "beauty",
  "skincare",
  "skin care",
  "hair care",
  "oral care",
  "baby care",
  "nappies",
  "pharmacy",
  "vitamins",
  "supplements",
];

const NON_FOOD_PRODUCT_TERMS = [
  "shampoo",
  "conditioner",
  "body wash",
  "hand wash",
  "soap",
  "moisturiser",
  "moisturizer",
  "skin cream",
  "hair oil",
  "massage oil",
  "essential oil",
  "lip balm",
  "toothpaste",
  "mouthwash",
  "deodorant",
  "detergent",
  "dishwashing",
  "surface cleaner",
  "cleaning spray",
  "laundry",
  "capsule",
  "capsules",
  "tablet",
  "tablets",
  "vitamin",
  "supplement",
  "protein powder",
];

const EXCLUDED_KETO_TERMS = [
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

function categoryText(item: GroceryListing) {
  return (item.category ?? "").toLowerCase();
}

function isHumanFood(item: GroceryListing) {
  const value = searchable(item);
  const category = categoryText(item);

  if (NON_HUMAN_FOOD_TERMS.some((term) => value.includes(term))) return false;
  if (NON_FOOD_PRODUCT_TERMS.some((term) => value.includes(term))) return false;
  if (NON_FOOD_CATEGORY_TERMS.some((term) => category.includes(term))) return false;

  return true;
}

function looksKeto(item: GroceryListing) {
  if (!isHumanFood(item)) return false;

  const value = searchable(item);
  return !EXCLUDED_KETO_TERMS.some((term) => value.includes(term));
}

export async function fetchKetoGroceries(location: string, group: KetoGroup = "all") {
  const terms = group === "all" ? ALL_TERMS : GROUP_TERMS[group];
  const listings = await fetchBasktGroceriesMany(terms, location);

  return listings
    .filter(looksKeto)
    .sort((a, b) => a.price - b.price);
}
