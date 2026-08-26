"use client";

import { useState } from "react";
import { GroceriesDashboard } from "@/components/groceries-dashboard";
import { RentalsDashboard } from "@/components/rentals-dashboard";

type Tab = "rentals" | "groceries";

export function AppDashboard() {
  const [tab, setTab] = useState<Tab>("rentals");

  return (
    <>
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
          borderBottom: "1px solid #dce5df",
          background: "rgba(250,252,250,.96)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          type="button"
          onClick={() => setTab("rentals")}
          aria-pressed={tab === "rentals"}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "10px 18px",
            cursor: "pointer",
            fontWeight: 800,
            background: tab === "rentals" ? "#173f2d" : "#edf3ef",
            color: tab === "rentals" ? "white" : "#234b36",
          }}
        >
          🏠 Rentals
        </button>
        <button
          type="button"
          onClick={() => setTab("groceries")}
          aria-pressed={tab === "groceries"}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "10px 18px",
            cursor: "pointer",
            fontWeight: 800,
            background: tab === "groceries" ? "#173f2d" : "#edf3ef",
            color: tab === "groceries" ? "white" : "#234b36",
          }}
        >
          🛒 Supermarkets
        </button>
      </nav>

      {tab === "rentals" ? <RentalsDashboard /> : <GroceriesDashboard />}
    </>
  );
}
