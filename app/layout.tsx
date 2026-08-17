import type { Metadata } from "next";
import "./globals.css";
import "./sources.css";
import "./export.css";
import "./filter-overrides.css";

export const metadata: Metadata = {
  title: "Blenheim Rentals",
  description: "A lightweight live view of current Blenheim rental listings.",
};

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
