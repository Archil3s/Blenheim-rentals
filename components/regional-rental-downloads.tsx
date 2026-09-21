"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RENTAL_REGIONS } from "@/lib/rentals/regions";
import type { Rental, RentalsResponse } from "@/lib/rentals/types";

const DIARY_SNAPSHOT_KEY = "rental-finder-housing-diary-snapshot-ids";

type RegionalRentalDownloadsProps = {
  focusRegion?: string;
};

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function regionFor(rental: Rental) {
  const rawRegion = rental.region?.trim() || "Marlborough";
  return (
    RENTAL_REGIONS.find((region) => region.name.toLowerCase() === rawRegion.toLowerCase())?.name ??
    rawRegion
  );
}

function listingRows(rentals: Rental[], newIds: Set<string>) {
  return rentals.map((rental) => [
    regionFor(rental),
    newIds.has(rental.id) ? "New" : "Current",
    rental.address,
    rental.suburb ?? rental.area ?? "",
    rental.rent ?? "",
    rental.bedrooms ?? "",
    rental.bathrooms ?? "",
    rental.parking ?? "",
    rental.propertyType ?? "",
    rental.propertyManager ?? rental.contactName ?? "",
    rental.source,
    rental.checkedAt ?? "",
    rental.url,
  ]);
}

const listingHeaders = [
  "Region",
  "Status",
  "Address",
  "Suburb / area",
  "Weekly rent (NZD)",
  "Bedrooms",
  "Bathrooms",
  "Parking",
  "Property type",
  "Property manager / contact",
  "Source",
  "Last checked",
  "Original listing URL",
];

export function RegionalRentalDownloads({ focusRegion }: RegionalRentalDownloadsProps) {
  const [data, setData] = useState<RentalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshotIds, setSnapshotIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/rentals", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load rentals");
      setData((await response.json()) as RentalsResponse);
    } catch {
      setError("Regional downloads could not load the current rental feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    try {
      const stored = JSON.parse(localStorage.getItem(DIARY_SNAPSHOT_KEY) ?? "[]") as string[];
      setSnapshotIds(Array.isArray(stored) ? stored : []);
    } catch {
      setSnapshotIds([]);
    }
  }, [load]);

  const snapshotSet = useMemo(() => new Set(snapshotIds), [snapshotIds]);
  const newIds = useMemo(
    () => new Set((data?.rentals ?? []).filter((rental) => !snapshotSet.has(rental.id)).map((rental) => rental.id)),
    [data, snapshotSet],
  );

  const rows = useMemo(() => {
    const knownRegions = RENTAL_REGIONS.map((region) => region.name);
    const discoveredRegions = Array.from(
      new Set((data?.rentals ?? []).map(regionFor).filter((region) => !knownRegions.includes(region))),
    ).sort((a, b) => a.localeCompare(b));
    const allRegions = [...knownRegions, ...discoveredRegions];

    const result = allRegions.map((region) => {
      const rentals = (data?.rentals ?? []).filter((rental) => regionFor(rental) === region);
      return {
        region,
        rentals,
        total: rentals.length,
        newCount: rentals.filter((rental) => newIds.has(rental.id)).length,
      };
    });

    if (!focusRegion) return result;
    return [...result].sort((a, b) => {
      if (a.region === focusRegion) return -1;
      if (b.region === focusRegion) return 1;
      return a.region.localeCompare(b.region);
    });
  }, [data, focusRegion, newIds]);

  const totalNew = newIds.size;

  const exportRegion = useCallback(
    (region: string) => {
      if (!data) return;
      const rentals = data.rentals
        .filter((rental) => regionFor(rental) === region)
        .sort((a, b) => a.address.localeCompare(b.address));
      const newCount = rentals.filter((rental) => newIds.has(rental.id)).length;
      const safeRegion = region.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      downloadCsv(`rentals-${safeRegion}.csv`, [
        ["Rental Finder regional export", region],
        ["Total homes", rentals.length],
        ["New homes", newCount],
        ["Exported", new Date().toISOString()],
        [],
        listingHeaders,
        ...listingRows(rentals, newIds),
      ]);
    },
    [data, newIds],
  );

  const exportAll = useCallback(() => {
    if (!data) return;
    const sortedRentals = [...data.rentals].sort((a, b) => {
      const regionCompare = regionFor(a).localeCompare(regionFor(b));
      return regionCompare || a.address.localeCompare(b.address);
    });
    const summaryRows = rows.map((row) => [row.region, row.total, row.newCount]);

    downloadCsv("rentals-all-regions.csv", [
      ["Rental Finder all-regions export"],
      ["Total homes", data.rentals.length],
      ["New homes", totalNew],
      ["Exported", new Date().toISOString()],
      [],
      ["Region summary"],
      ["Region", "Total homes", "New homes"],
      ...summaryRows,
      [],
      listingHeaders,
      ...listingRows(sortedRentals, newIds),
    ]);
  }, [data, newIds, rows, totalNew]);

  return (
    <section
      aria-label="Regional rental downloads"
      style={{
        width: "min(1180px, calc(100% - 28px))",
        margin: "18px auto 0",
        padding: 16,
        border: "1px solid #d7e5dc",
        borderRadius: 18,
        background: "#f8fbf9",
        boxShadow: "0 8px 24px rgba(23,63,45,.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#557063", fontSize: 12, fontWeight: 900, letterSpacing: ".08em" }}>
            REGIONAL DOWNLOADS
          </p>
          <h2 style={{ margin: "4px 0 3px", color: "#173f2d", fontSize: "1.25rem" }}>Download all houses by region</h2>
          <p style={{ margin: 0, color: "#66766d" }}>
            Each CSV includes every current house in that region and marks homes that are new since the housing-diary checkpoint.
          </p>
        </div>

        <button
          type="button"
          onClick={exportAll}
          disabled={loading || !data}
          style={{
            minHeight: 44,
            padding: "10px 15px",
            border: 0,
            borderRadius: 12,
            background: "#173f2d",
            color: "white",
            fontWeight: 900,
            cursor: data ? "pointer" : "default",
          }}
        >
          Download all regions
        </button>
      </div>

      {error && <div style={{ padding: 10, borderRadius: 10, background: "#fff3f1", color: "#8a2e23" }}>{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 10,
        }}
      >
        {rows.map((row) => (
          <div
            key={row.region}
            style={{
              display: "grid",
              gap: 9,
              padding: 13,
              border: row.region === focusRegion ? "2px solid #2f7b50" : "1px solid #dce7e0",
              borderRadius: 14,
              background: "white",
            }}
          >
            <strong style={{ color: "#173f2d" }}>{row.region}</strong>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ padding: "5px 8px", borderRadius: 999, background: "#edf3ef", fontWeight: 800 }}>
                {row.total} total
              </span>
              <span style={{ padding: "5px 8px", borderRadius: 999, background: "#dff7e8", color: "#0c6131", fontWeight: 800 }}>
                {row.newCount} new
              </span>
            </div>
            <button
              type="button"
              onClick={() => exportRegion(row.region)}
              disabled={!data || row.total === 0}
              style={{
                minHeight: 38,
                border: "1px solid #bcd2c4",
                borderRadius: 10,
                background: row.total ? "#f6faf7" : "#f3f4f3",
                color: row.total ? "#173f2d" : "#87928c",
                fontWeight: 850,
                cursor: row.total ? "pointer" : "default",
              }}
            >
              {row.total ? `Download ${row.total} homes` : "No homes to download"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12, color: "#52685c", fontWeight: 800 }}>
        <span>{data?.rentals.length ?? 0} homes across all regions</span>
        <span>{totalNew} new homes</span>
      </div>
    </section>
  );
}
