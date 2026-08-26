import { AppDashboard } from "@/components/app-dashboard";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blenheim-rentals.daniel-dutoit.workers.dev";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Blenheim Finder",
    url: siteUrl,
    description:
      "Search current New Zealand rentals and compare latest observed supermarket prices around Blenheim and Marlborough.",
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
      <AppDashboard />
    </>
  );
}
