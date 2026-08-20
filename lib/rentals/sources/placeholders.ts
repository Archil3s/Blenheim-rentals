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

// These providers remain disabled until an appropriate API/feed/permission route is available.
// Keep them explicit so users can see coverage gaps without pretending the source is live.
export const tradeMeSource = placeholder("Trade Me Property");
export const realestateSource = placeholder("realestate.co.nz");
export const myRentSource = placeholder("myRent");
export const harcourtsSource = placeholder("Harcourts Blenheim");
export const propertyBrokersSource = placeholder("Property Brokers Blenheim");
export const homesSource = placeholder("homes.co.nz");
