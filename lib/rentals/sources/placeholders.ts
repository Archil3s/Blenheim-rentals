import type { RentalSourceAdapter } from "../types";

function placeholder(name: string): RentalSourceAdapter {
  return {
    name,
    enabled: false,
    async fetchRentals() {
      return [];
    },
  };
}

// Keep each provider isolated. Enable an adapter only after implementing a source-approved
// access method (official API/feed where available, or permitted public-page retrieval).
export const tradeMeSource = placeholder("Trade Me Property");
export const realestateSource = placeholder("realestate.co.nz");
export const myRentSource = placeholder("myRent");
export const summitSource = placeholder("Summit Real Estate");
export const localAgenciesSource = placeholder("Local agencies");
