export type RentalSourceDirectoryEntry = {
  name: string;
  url: string;
  access: "live" | "api" | "permission" | "manual";
  note: string;
};

export const rentalSourceDirectory: RentalSourceDirectoryEntry[] = [
  {
    name: "OneRoof",
    url: "https://www.oneroof.co.nz/search/houses-for-rent/district_marlborough-marlborough-270_page_1",
    access: "live",
    note: "Public search-page HTTP feed",
  },
  {
    name: "Ray White Blenheim",
    url: "https://rwblenheim.co.nz/properties/residential-for-rent?category=&suburbPostCode=",
    access: "live",
    note: "Live public HTTP feed",
  },
  {
    name: "Ray White Complete PM",
    url: "https://completerentals.co.nz/properties/residential-for-rent?category=&suburbPostCode=",
    access: "live",
    note: "Live public HTTP feed",
  },
  {
    name: "B&N Properties",
    url: "https://www.bnproperties.co.nz/property/",
    access: "live",
    note: "Live public HTTP feed",
  },
  {
    name: "Quinovic Blenheim",
    url: "https://www.quinovic.co.nz/for-rent/marlborough/",
    access: "live",
    note: "Live public HTTP feed with detail-page enrichment",
  },
  {
    name: "Bayleys Marlborough",
    url: "https://marlborough.bayleys.co.nz/offices/marlborough-410",
    access: "live",
    note: "Public office/listing pages parsed for current Marlborough rentals",
  },
  {
    name: "Summit Property Management",
    url: "https://summit.co.nz/rent/listings/",
    access: "permission",
    note: "HTTP/detail-page adapter implemented; remains opt-in pending provider approval",
  },
  {
    name: "realestate.co.nz",
    url: "https://www.realestate.co.nz/residential/rental/marlborough/marlborough",
    access: "api",
    note: "Use the official Listings API rather than scraping",
  },
  {
    name: "Harcourts Blenheim",
    url: "https://harcourts.net/nz/office/blenheim",
    access: "manual",
    note: "Public provider site; automatic discovery not yet reliable enough to enable",
  },
  {
    name: "Property Brokers Blenheim",
    url: "https://www.propertybrokers.co.nz/rent",
    access: "manual",
    note: "Provider terms restrict content reuse without authorisation",
  },
  {
    name: "myRent",
    url: "https://www.myrent.co.nz/rentals/blenheim-blenheim",
    access: "permission",
    note: "Current terms prohibit screen/database scraping; kept as a direct cross-check",
  },
  {
    name: "Trade Me Property",
    url: "https://www.trademe.co.nz/a/property/residential/rent",
    access: "permission",
    note: "Current developer rules restrict combining Trade Me listings with other-site listings",
  },
  {
    name: "homes.co.nz",
    url: "https://homes.co.nz/",
    access: "manual",
    note: "Public rental detail pages exist, but reliable location-based discovery is not enabled yet",
  },
];
