import { RentalsDashboard } from "@/components/rentals-dashboard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blenheim-rentals.daniel-dutoit.workers.dev";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Rental Finder NZ",
    url: siteUrl,
    description:
      "Search current regional New Zealand rentals from multiple sources and open the original listing.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <RentalsDashboard />
    </>
  );
}
