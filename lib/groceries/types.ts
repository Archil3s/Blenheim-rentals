export type GroceryListing = {
  id: string;
  name: string;
  brand?: string | null;
  size?: string | null;
  category?: string | null;
  chain: string;
  store: string;
  region?: string | null;
  price: number;
  unitPrice?: number | null;
  unitLabel?: string | null;
  promo?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  observedAt?: string | null;
};

export type GroceryFeed = {
  listings: GroceryListing[];
  checkedAt: string;
  source: "Baskt";
  query: string;
  location: string;
};

export type GroceriesResponse = GroceryFeed & {
  error?: string;
};
