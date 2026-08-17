export type Rental = {
  id: string;
  address: string;
  suburb?: string;
  area?: string;
  rent: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  imageUrl?: string;
  source: string;
  sourceListingId?: string;
  url: string;

  // Housing-search diary fields. checkedAt is stamped by the aggregator on refresh.
  checkedAt?: string;
  contactType?: string;
  propertyType?: string;
  propertyManager?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  notes?: string;
  outcome?: string;
  followUpAction?: string;
  rating?: number | null;
};

export type SourceStatus = {
  source: string;
  configured: boolean;
  ok: boolean;
  count: number;
  error?: string;
};

export type RentalsResponse = {
  rentals: Rental[];
  total: number;
  checkedAt: string;
  sources: SourceStatus[];
  fromCache: boolean;
};

export type RentalFeed = Omit<RentalsResponse, "fromCache">;

export type RentalSourceAdapter = {
  name: string;
  enabled: boolean;
  fetchRentals: () => Promise<Rental[]>;
};
