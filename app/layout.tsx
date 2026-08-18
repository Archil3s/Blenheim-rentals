import type { Metadata, Viewport } from "next";
import { DesktopPopoutPrompt } from "@/components/desktop-popout-prompt";
import "./globals.css";
import "./sources.css";
import "./export.css";
import "./rental-enhancements.css";
import "./regions.css";
import "./install-prompt.css";

export const metadata: Metadata = {
  title: "NZ Regional Rental Finder",
  description:
    "Current rental listings across Wellington and selected South Island regions with housing diary export.",
  applicationName: "Rental Finder",
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