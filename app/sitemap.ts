import type { MetadataRoute } from "next";
import { RENTAL_REGIONS } from "@/lib/rentals/regions";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blenheim-rentals.daniel-dutoit.workers.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...RENTAL_REGIONS.map((region) => ({
      url: `${siteUrl}/rentals/${region.slug}`,
      lastModified: now,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
