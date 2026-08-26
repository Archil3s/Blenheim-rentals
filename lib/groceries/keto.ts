import { fetchBasktGroceriesMany } from "./baskt";
import type { GroceryListing } from "./types";

export type KetoGroup = "all" | "meat" | "seafood" | "eggs" | "cheese" | "dairy";

const GROUP_TERMS: Record<Exclude<KetoGroup, "all">, string[]> = {
  meat: [
    "beef",
    "steak",
    "mince",
    "chicken",
    "lamb",
    "pork",
    "bacon",
    "ham",
    "brisket",
    "ribs",
    "liver",
    "kidney",
    "offal",
  ],
  seafood: ["salmon", "tuna", "sardine", "prawn", "shrimp", "fish", "mussel", "oyster"],
  eggs: ["eggs", "egg"],
  cheese: ["cheese", "cheddar", "mozzarella", "feta", "parmesan", "halloumi", "brie", "camembert"],
  dairy: ["butter", "cream", "ghee", "sour cream"],
};

const ALL_TERMS = Array.from(new Set(Object.values(GROUP_TERMS).flat()));

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
  "body butter",
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

// Anything here is incompatible with the strict carnivore-keto view or is too
// ambiguous to classify safely without a full nutrition/ingredient panel.
const CARNIVORE_EXCLUDED_TERMS = [
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
  "chips",
  "crisps",
  "snack",
  "wrap",
  "sandwich",
  "marinade",
  "marinated",
  "glaze",
  "sauce",
  "teriyaki",
  "sweet chilli",
  "bbq",
  "barbecue",
  "seasoning",
  "flavour",
  "flavor",
  "stuffing",
  "mayonnaise",
  "mayo",
  "peanut",
  "almond",
  "macadamia",
  "walnut",
  "pecan",
  "cashew",
  "chia",
  "flax",
  "seed",
  "nuts",
  "nut butter",
  "olive",
  "olive oil",
  "coconut",
  "coconut oil",
  "avocado",
  "avocado oil",
  "vegetable oil",
  "canola oil",
  "sunflower oil",
  "soy",
  "tofu",
  "tempeh",
  "bean",
  "lentil",
  "chickpea",
  "broccoli",
  "cauliflower",
  "spinach",
  "lettuce",
  "courgette",
  "zucchini",
  "mushroom",
  "cucumber",
  "cabbage",
  "asparagus",
  "vegetable",
  "salad",
  "fruit",
  "berries",
  "berry",
  "plant based",
  "plant-based",
  "vegan",
  "vegetarian",
];

const ANIMAL_FOOD_TERMS = [
  "beef",
  "steak",
  "mince",
  "chicken",
  "lamb",
  "pork",
  "bacon",
  "ham",
  "brisket",
  "ribs",
  "liver",
  "kidney",
  "offal",
  "salmon",
  "tuna",
  "sardine",
  "prawn",
  "shrimp",
  "fish",
  "mussel",
  "oyster",
  "egg",
  "cheese",
  "cheddar",
  "mozzarella",
  "feta",
  "parmesan",
  "halloumi",
  "brie",
  "camembert",
  "butter",
  "cream",
  "ghee",
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

function looksCarnivoreKeto(item: GroceryListing) {
  if (!isHumanFood(item)) return false;

  const value = searchable(item);
  if (!ANIMAL_FOOD_TERMS.some((term) => value.includes(term))) return false;
  if (CARNIVORE_EXCLUDED_TERMS.some((term) => value.includes(term))) return false;

  return true;
}

export async function fetchKetoGroceries(location: string, group: KetoGroup = "all") {
  const terms = group === "all" ? ALL_TERMS : GROUP_TERMS[group];
  const listings = await fetchBasktGroceriesMany(terms, location);

  return listings
    .filter(looksCarnivoreKeto)
    .sort((a, b) => a.price - b.price);
}
