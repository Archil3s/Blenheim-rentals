import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RentalsDashboard } from "@/components/rentals-dashboard";
import { RENTAL_REGIONS, rentalRegionBySlug } from "@/lib/rentals/regions";

type RegionPageProps = {
  params: Promise<{ region: string }>;
};

export function generateStaticParams() {
  return RENTAL_REGIONS.map((region) => ({ region: region.slug }));
}

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { region: slug } = await params;
  const region = rentalRegionBySlug(slug);

  if (!region) {
    return {
      title: "Regional rentals",
      robots: { index: false, follow: false },
    };
  }

  const description = `Search current ${region.name} rentals from multiple sources, filter by weekly rent and bedrooms, and open the original property listing.`;

  return {
    title: `${region.name} rentals`,
    description,
    alternates: {
      canonical: `/rentals/${region.slug}`,
    },
    openGraph: {
      title: `${region.name} rentals | Rental Finder NZ`,
      description,
      url: `/rentals/${region.slug}`,
    },
  };
}

export default async function RegionPage({ params }: RegionPageProps) {
  const { region: slug } = await params;
  const region = rentalRegionBySlug(slug);

  if (!region) notFound();

  return <RentalsDashboard initialRegion={region.name} />;
}
