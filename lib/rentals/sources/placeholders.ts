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

// These providers are represented in the app but remain disabled until a permitted
// API/feed/permission route is available. Keep them explicit so users can see coverage gaps.
export const tradeMeSource = placeholder("Trade Me Property");
export const realestateSource = placeholder("realestate.co.nz");
export const myRentSource = placeholder("myRent");
export const summitSource = placeholder("Summit Real Estate");
export const bayleysSource = placeholder("Bayleys Marlborough");
export const harcourtsSource = placeholder("Harcourts Blenheim");
export const propertyBrokersSource = placeholder("Property Brokers Blenheim");
export const homesSource = placeholder("homes.co.nz");
