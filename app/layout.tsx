import type { Metadata } from "next";
import "./globals.css";
import "./sources.css";
import "./export.css";
import "./rental-enhancements.css";

export const metadata: Metadata = {
  title: "Marlborough + Nelson Rentals",
  description: "A lightweight live view of current Marlborough and Nelson rental listings.",
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
