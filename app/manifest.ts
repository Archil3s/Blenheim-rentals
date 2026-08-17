import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Marlborough, Nelson, Kaikōura + Christchurch Rental Finder",
    short_name: "Rental Finder",
    description:
      "Current rental listings across Marlborough, Nelson, Kaikōura and Christchurch with housing diary export.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f5",
    theme_color: "#143d2a",
  };
}
