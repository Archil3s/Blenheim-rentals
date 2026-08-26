import type { GroceryListing } from "./types";

export type CarnivoreValue = {
  pricePerKg: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  costPer100gProtein: number | null;
};

const PROTEIN_RULES: Array<[RegExp, number]> = [
  [/(tuna|prawn|shrimp)/i, 24],
  [/(sardine|salmon|fish|mussel|oyster)/i, 21],
  [/(chicken|turkey)/i, 27],
  [/(beef|steak|brisket|mince)/i, 26],
  [/(lamb|mutton)/i, 25],
  [/(pork|ham)/i, 27],
  [/(bacon)/i, 20],
  [/(liver|kidney|offal)/i, 22],
  [/(parmesan)/i, 35],
  [/(cheddar|mozzarella|halloumi|cheese)/i, 25],
  [/(feta|brie|camembert)/i, 18],
  [/(egg)/i, 13],
  [/(sour cream)/i, 3],
  [/(cream)/i, 2],
  [/(butter|ghee)/i, 1],
];

// Approximate total carbohydrate grams per 100 g for plain versions of each
// food type. These are fallback estimates only; processed products can vary.
const CARB_RULES: Array<[RegExp, number]> = [
  [/(ghee)/i, 0],
  [/(butter)/i, 0.1],
  [/(beef|steak|brisket|mince|lamb|mutton|pork|chicken|turkey|tuna|sardine|salmon|fish|prawn|shrimp|mussel|oyster|liver|kidney|offal)/i, 0],
  [/(bacon|ham)/i, 1],
  [/(egg)/i, 0.7],
  [/(brie|camembert)/i, 0.5],
  [/(cheddar)/i, 1.3],
  [/(mozzarella|halloumi)/i, 2.2],
  [/(parmesan)/i, 4.1],
  [/(feta)/i, 4.1],
  [/(sour cream)/i, 4.6],
  [/(cream)/i, 3],
  [/(cheese)/i, 2],
];

const OBVIOUS_NON_CARNIVORE_PATTERNS = [
  /\b(?:fries?|french fries|wedges?|hash browns?|rosti|tater(?:s| tots?)?|potato|kumara)\b/i,
  /\b(?:chips?|crisps?|croquettes?|nuggets?|fish fingers?|sausage rolls?)\b/i,
  /\b(?:bread|cracker|biscuit|cookie|cake|cereal|rice|pasta|noodle|flour|pizza|pie|pastry)\b/i,
  /\b(?:crumbed|breaded|battered?|sweetened|sugar|syrup|jam|chocolate)\b/i,
  /\b(?:plant[- ]based|vegan|vegetarian|soy|tofu|bean|lentil|chickpea)\b/i,
];

function text(item: GroceryListing) {
  return [item.name, item.brand, item.category].filter(Boolean).join(" ");
}

function isObviouslyNonCarnivore(item: GroceryListing) {
  const value = text(item);
  return OBVIOUS_NON_CARNIVORE_PATTERNS.some((pattern) => pattern.test(value));
}

export function estimateProteinPer100g(item: GroceryListing): number | null {
  if (isObviouslyNonCarnivore(item)) return null;
  const value = text(item);
  for (const [pattern, protein] of PROTEIN_RULES) {
    if (pattern.test(value)) return protein;
  }
  return null;
}

export function estimateCarbsPer100g(item: GroceryListing): number | null {
  if (isObviouslyNonCarnivore(item)) return null;
  const value = text(item);
  for (const [pattern, carbs] of CARB_RULES) {
    if (pattern.test(value)) return carbs;
  }
  return null;
}

function pricePerKgFromUnitPrice(item: GroceryListing): number | null {
  if (item.unitPrice == null || !Number.isFinite(item.unitPrice) || item.unitPrice <= 0) return null;
  const label = (item.unitLabel ?? "").trim().toLowerCase().replace(/\s+/g, "");

  if (!label) return null;
  if (label.includes("100g")) return item.unitPrice * 10;
  if (label.includes("10g")) return item.unitPrice * 100;
  if (label === "kg" || label.includes("/kg") || label.includes("perkg") || label.includes("1kg")) return item.unitPrice;

  return null;
}

function pricePerKgFromPack(item: GroceryListing): number | null {
  const size = (item.size ?? "").toLowerCase().replace(/,/g, ".");
  if (!size) return null;

  const kg = size.match(/(?:^|\s|x)(\d+(?:\.\d+)?)\s*kg\b/i);
  if (kg) {
    const weightKg = Number(kg[1]);
    return weightKg > 0 ? item.price / weightKg : null;
  }

  const grams = size.match(/(?:^|\s|x)(\d+(?:\.\d+)?)\s*g\b/i);
  if (grams) {
    const weightKg = Number(grams[1]) / 1000;
    return weightKg > 0 ? item.price / weightKg : null;
  }

  return null;
}

export function estimatePricePerKg(item: GroceryListing): number | null {
  return pricePerKgFromUnitPrice(item) ?? pricePerKgFromPack(item);
}

export function carnivoreValue(item: GroceryListing): CarnivoreValue {
  const pricePerKg = estimatePricePerKg(item);
  const proteinPer100g = estimateProteinPer100g(item);
  const carbsPer100g = estimateCarbsPer100g(item);
  const costPer100gProtein =
    pricePerKg != null && proteinPer100g != null && proteinPer100g > 0
      ? (pricePerKg * 10) / proteinPer100g
      : null;

  return { pricePerKg, proteinPer100g, carbsPer100g, costPer100gProtein };
}
