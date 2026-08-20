import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rental Finder NZ",
    short_name: "Rental Finder",
    description:
      "Search regional New Zealand rentals from multiple sources and jump directly to the original listing.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#143d2a",
    categories: ["lifestyle", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Marlborough rentals",
        short_name: "Marlborough",
        url: "/rentals/marlborough",
      },
      {
        name: "Wellington rentals",
        short_name: "Wellington",
        url: "/rentals/wellington",
      },
      {
        name: "Christchurch rentals",
        short_name: "Christchurch",
        url: "/rentals/christchurch",
      },
    ],
  };
}
