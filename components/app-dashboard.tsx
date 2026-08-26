"use client";

import { useState } from "react";
import { GroceriesDashboard } from "@/components/groceries-dashboard";
import {
  NewRentalsDashboard,
  RentalDiscoveryTracker,
} from "@/components/new-rentals-dashboard";
import { RentalsDashboard } from "@/components/rentals-dashboard";

type Tab = "rentals" | "new-rentals" | "groceries";

export function AppDashboard() {
  const [tab, setTab] = useState<Tab>("rentals");

  const tabStyle = (active: boolean) => ({
    border: 0,
    borderRadius: 999,
    padding: "10px 18px",
    cursor: "pointer",
    fontWeight: 800,
    background: active ? "#173f2d" : "#edf3ef",
    color: active ? "white" : "#234b36",
    whiteSpace: "nowrap" as const,
  });

  return (
    <>
      <RentalDiscoveryTracker />

      <nav
        aria-label="Finder sections"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          padding: "10px 14px",
          overflowX: "auto",
          borderBottom: "1px solid #dce5df",
          background: "rgba(250,252,250,.96)",
          backdropFilter: "blur(12px)",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("rentals")}
          aria-pressed={tab === "rentals"}
          style={tabStyle(tab === "rentals")}
        >
          🏠 Rentals
        </button>

        <button
          type="button"
          onClick={() => setTab("new-rentals")}
          aria-pressed={tab === "new-rentals"}
          style={tabStyle(tab === "new-rentals")}
        >
          🆕 New listings
        </button>

        <button
          type="button"
          onClick={() => setTab("groceries")}
          aria-pressed={tab === "groceries"}
          style={tabStyle(tab === "groceries")}
        >
          🛒 Supermarkets
        </button>
      </nav>

      {tab === "rentals" && <RentalsDashboard />}
      {tab === "new-rentals" && <NewRentalsDashboard onOpenRentals={() => setTab("rentals")} />}
      {tab === "groceries" && <GroceriesDashboard />}
    </>
  );
}
