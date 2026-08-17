import type { RentalSourceAdapter } from "../types";

export const demoSource: RentalSourceAdapter = {
  name: "Demo listings",
  enabled: process.env.RENTALS_DEMO_MODE !== "false",
  async fetchRentals() {
    return [
      {
        id: "demo-springlands-1",
        address: "12 Example Street, Blenheim",
        suburb: "Springlands",
        area: "Blenheim",
        rent: 520,
        bedrooms: 2,
        bathrooms: 1,
        source: "Demo listings",
        sourceListingId: "springlands-1",
        url: "https://example.com/rental/springlands-1",
      },
      {
        id: "demo-redwoodtown-1",
        address: "34 Sample Road, Blenheim",
        suburb: "Redwoodtown",
        area: "Blenheim",
        rent: 580,
        bedrooms: 3,
        bathrooms: 1,
        source: "Demo listings",
        sourceListingId: "redwoodtown-1",
        url: "https://example.com/rental/redwoodtown-1",
      },
      {
        id: "demo-witherlea-1",
        address: "8 Placeholder Avenue, Blenheim",
        suburb: "Witherlea",
        area: "Blenheim",
        rent: 620,
        bedrooms: 3,
        bathrooms: 2,
        source: "Demo listings",
        sourceListingId: "witherlea-1",
        url: "https://example.com/rental/witherlea-1",
      },
      {
        id: "demo-blenheim-1",
        address: "91 Mockingbird Drive, Blenheim",
        suburb: "Blenheim",
        area: "Blenheim",
        rent: 680,
        bedrooms: 4,
        bathrooms: 2,
        source: "Demo listings",
        sourceListingId: "blenheim-1",
        url: "https://example.com/rental/blenheim-1",
      },
    ];
  },
};
