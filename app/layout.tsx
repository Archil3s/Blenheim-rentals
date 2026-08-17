import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./sources.css";
import "./export.css";
import "./rental-enhancements.css";
import "./iphone.css";

export const metadata: Metadata = {
  title: "Marlborough + Nelson Rentals",
  description: "A lightweight live view of current Marlborough and Nelson rental listings.",
  applicationName: "Rental Finder",
  appleWebApp: {
    capable: true,
    title: "Rental Finder",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#143d2a",
} as Viewport;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NZ">
      <body>{children}</body>
    </html>
  );
}
