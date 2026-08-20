import type { Metadata, Viewport } from "next";
import { DesktopPopoutPrompt } from "@/components/desktop-popout-prompt";
import "./globals.css";
import "./sources.css";
import "./export.css";
import "./rental-enhancements.css";
import "./regions.css";
import "./install-prompt.css";
import "./growth.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://blenheim-rentals.daniel-dutoit.workers.dev";
const siteDescription =
  "Search current rentals across Marlborough, Wellington and key South Island centres, compare essential details and open the original listing.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Rental Finder NZ | Regional rentals in one place",
    template: "%s | Rental Finder NZ",
  },
  description: siteDescription,
  applicationName: "Rental Finder",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Rental Finder NZ",
    description: siteDescription,
    url: "/",
    siteName: "Rental Finder NZ",
    locale: "en_NZ",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Rental Finder NZ",
    description: siteDescription,
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Rental Finder",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#143d2a",
} as Viewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NZ">
      <body>
        {children}
        <DesktopPopoutPrompt />
      </body>
    </html>
  );
}
