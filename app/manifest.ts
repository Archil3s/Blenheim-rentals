import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NZ Regional Rental Finder",
    short_name: "Rental Finder",
    description:
      "Current rental listings across Wellington and selected South Island regions with housing diary export.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#143d2a",
  };
}