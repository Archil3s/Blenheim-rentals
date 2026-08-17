export type RentalSourceDirectoryEntry = {
  name: string;
  url: string;
  access: "live" | "api" | "permission" | "manual";
  note: string;
};

export const rentalSourceDirectory: RentalSourceDirectoryEntry[] = [
  {
    name: "Ray White Blenheim",
    url: "https://rwblenheim.co.nz/properties/residential-for-rent?category=&suburbPostCode=",
    access: "live",
    note: "Live HTTP feed enabled",
  },
  {
    name: "Ray White Complete PM",
    url: "https://completerentals.co.nz/properties/residential-for-rent?category=&suburbPostCode=",
    access: "live",
    note: "Live HTTP feed enabled",
  },
  {
    name: "B&N Properties",
    url: "https://www.bnproperties.co.nz/property/",
    access: "live",
    note: "Live HTTP feed enabled",
  },
  {
    name: "Quinovic Blenheim",
    url: "https://www.quinovic.co.nz/for-rent/marlborough/",
    access: "live",
    note: "Live HTTP feed enabled with detail-page contact enrichment",
  },
  {
    name: "realestate.co.nz",
    url: "https://www.realestate.co.nz/residential/rental/marlborough/marlborough",
    access: "api",
    note: "Official Listings API credentials required",
  },
  {
    name: "Bayleys Marlborough",
    url: "https://marlborough.bayleys.co.nz/propertyservices/residential-property-management",
    access: "manual",
    note: "Detail pages expose manager/contact data; automatic discovery adapter next",
  },
  {
    name: "Harcourts Blenheim",
    url: "https://harcourts.net/nz/office/blenheim",
    access: "manual",
    note: "Open provider site; automatic feed not enabled",
  },
  {
    name: "Property Brokers Blenheim",
    url: "https://www.propertybrokers.co.nz/rent",
    access: "manual",
    note: "Provider terms restrict content reuse without authorisation",
  },
  {
    name: "Summit Property Management",
    url: "https://www.summit.co.nz/rent/listings/?_location=Blenheim+%28area%29&action_search=Search&location=area-1",
    access: "permission",
    note: "Permission/approved access needed for automated collection",
  },
  {
    name: "OneRoof",
    url: "https://www.oneroof.co.nz/search/houses-for-rent/district_marlborough-marlborough-270_page_1",
    access: "permission",
    note: "Technical adapter exists but automatic collection is disabled under current platform terms",
  },
  {
    name: "myRent",
    url: "https://www.myrent.co.nz/",
    access: "permission",
    note: "Automatic scraping disabled under current platform terms",
  },
  {
    name: "Trade Me Property",
    url: "https://www.trademe.co.nz/a/property/residential/rent",
    access: "permission",
    note: "Trade Me does not permit aggregation with other listing sites",
  },
  {
    name: "homes.co.nz",
    url: "https://homes.co.nz/",
    access: "manual",
    note: "Useful cross-check; automatic feed not enabled",
  },
];
