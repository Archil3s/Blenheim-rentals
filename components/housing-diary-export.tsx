"use client";

import { useState } from "react";
import type { Rental } from "@/lib/rentals/types";

type HousingDiaryExportProps = {
  rentals: Rental[];
};

export function HousingDiaryExport({ rentals }: HousingDiaryExportProps) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportDiary() {
    if (rentals.length === 0 || exporting) return;

    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/housing-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentalIds: rentals.map((rental) => rental.id),
          rentals,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Could not create housing diary");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "Housing Search Diary.docx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not create housing diary");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="simple-diary-export" aria-label="Housing diary export">
      <div>
        <p className="export-eyebrow">CMM HOUSING SEARCH DIARY</p>
        <h2>Export housing diary</h2>
        <p>
          Downloads the rentals currently shown by your search and filters into the housing-search diary Word document.
        </p>
      </div>
      <div className="export-controls">
        <button
          type="button"
          className="export-button"
          onClick={() => void exportDiary()}
          disabled={exporting || rentals.length === 0}
        >
          {exporting ? "Creating housing diary…" : `Export housing diary (${rentals.length})`}
        </button>
        {rentals.length === 0 && <span className="export-count">No matching rentals to export.</span>}
        {error && <span className="export-error">{error}</span>}
      </div>
    </section>
  );
}
