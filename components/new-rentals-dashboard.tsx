"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Rental, RentalsResponse } from "@/lib/rentals/types";

const FIRST_SEEN_KEY = "rental-finder-first-seen-v1";
const DIARY_SNAPSHOT_KEY = "rental-finder-housing-diary-snapshot-ids";
const DIARY_LAST_DOWNLOAD_KEY = "rental-finder-housing-diary-last-download";

const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

type AgeFilter = "today" | "24h" | "3d" | "7d" | "14d" | "all";

type FirstSeenMap = Record<string, string>;

type NewRentalsDashboardProps = {
  onOpenRentals?: () => void;
};

const AGE_FILTERS: Array<{ id: AgeFilter; label: string; maxMs?: number }> = [
  { id: "today", label: "Today" },
  { id: "24h", label: "≤24h", maxMs: 24 * 60 * 60 * 1000 },
  { id: "3d", label: "≤3 days", maxMs: 3 * 24 * 60 * 60 * 1000 },
  { id: "7d", label: "≤7 days", maxMs: 7 * 24 * 60 * 60 * 1000 },
  { id: "14d", label: "≤14 days", maxMs: 14 * 24 * 60 * 60 * 1000 },
  { id: "all", label: "All tracked" },
];

function safeFirstSeenMap(): FirstSeenMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(FIRST_SEEN_KEY) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([id, value]) =>
          Boolean(id) &&
          typeof value === "string" &&
          !Number.isNaN(new Date(value).getTime()),
      ),
    );
  } catch {
    return {};
  }
}

function diarySnapshot() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DIARY_SNAPSHOT_KEY) ?? "[]") as unknown;
    return new Set(
      Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [],
    );
  } catch {
    return new Set<string>();
  }
}

function stampFirstSeen(rentals: Rental[]) {
  const next = safeFirstSeenMap();
  const snapshot = diarySnapshot();
  const lastDiary = localStorage.getItem(DIARY_LAST_DOWNLOAD_KEY);
  const now = new Date().toISOString();
  let changed = false;

  for (const rental of rentals) {
    if (next[rental.id]) continue;

    // When first-seen tracking is introduced on a device that already has a
    // diary checkpoint, listings that were already in that diary must be at
    // least as old as the checkpoint. Everything else starts aging now.
    next[rental.id] = snapshot.has(rental.id) && lastDiary ? lastDiary : now;
    changed = true;
  }

  if (changed) {
    localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(next));
  }

  return next;
}

function ageMs(value?: string) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : Math.max(0, Date.now() - time);
}

function sameLocalDay(value?: string) {
  if (!value) return false;
  const then = new Date(value);
  if (Number.isNaN(then.getTime())) return false;
  const now = new Date();
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
}

function matchesAge(value: string | undefined, filter: AgeFilter) {
  if (filter === "all") return Boolean(value);
  if (filter === "today") return sameLocalDay(value);
  const definition = AGE_FILTERS.find((item) => item.id === filter);
  return Boolean(value && definition?.maxMs != null && ageMs(value) <= definition.maxMs);
}

function ageLabel(value?: string) {
  if (!value) return "Age unknown";
  const elapsed = ageMs(value);
  if (!Number.isFinite(elapsed)) return "Age unknown";

  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return "First seen just now";
  if (minutes < 60) return `First seen ${minutes} min ago`;

  const hours = Math.floor(elapsed / 3600000);
  if (hours < 24) return `First seen ${hours}h ago`;

  const days = Math.floor(elapsed / 86400000);
  if (days === 1) return "First seen yesterday";
  return `First seen ${days} days ago`;
}

function checkedLabel(value?: string) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not checked yet";
  return new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(date);
}

async function fetchCurrentRentals() {
  const response = await fetch("/api/rentals", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load rentals");
  return (await response.json()) as RentalsResponse;
}

/**
 * Mounted once by AppDashboard so first-seen timestamps are captured whenever
 * the site is opened, even if the user never opens the New listings tab.
 */
export function RentalDiscoveryTracker() {
  useEffect(() => {
    let cancelled = false;

    void fetchCurrentRentals()
      .then((payload) => {
        if (!cancelled) stampFirstSeen(payload.rentals);
      })
      .catch(() => {
        // The visible dashboards handle feed errors. Tracking is best-effort.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

export function NewRentalsDashboard({ onOpenRentals }: NewRentalsDashboardProps) {
  const [data, setData] = useState<RentalsResponse | null>(null);
  const [firstSeen, setFirstSeen] = useState<FirstSeenMap>({});
  const [snapshotIds, setSnapshotIds] = useState<Set<string>>(new Set());
  const [lastDiary, setLastDiary] = useState<string | null>(null);
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rentals${force ? "?refresh=1" : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load rentals");
      const payload = (await response.json()) as RentalsResponse;
      const stamped = stampFirstSeen(payload.rentals);
      setData(payload);
      setFirstSeen(stamped);
      setSnapshotIds(diarySnapshot());
      setLastDiary(localStorage.getItem(DIARY_LAST_DOWNLOAD_KEY));
    } catch {
      setError("The rental feed could not be loaded. Try refreshing shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const pendingDiaryIds = useMemo(() => {
    return new Set((data?.rentals ?? []).filter((rental) => !snapshotIds.has(rental.id)).map((rental) => rental.id));
  }, [data, snapshotIds]);

  const ageCounts = useMemo(() => {
    const rentals = data?.rentals ?? [];
    return Object.fromEntries(
      AGE_FILTERS.map((filter) => [
        filter.id,
        rentals.filter((rental) => matchesAge(firstSeen[rental.id], filter.id)).length,
      ]),
    ) as Record<AgeFilter, number>;
  }, [data, firstSeen]);

  const visibleRentals = useMemo(() => {
    return [...(data?.rentals ?? [])]
      .filter((rental) => matchesAge(firstSeen[rental.id], ageFilter))
      .sort((a, b) => {
        const aTime = new Date(firstSeen[a.id] ?? 0).getTime();
        const bTime = new Date(firstSeen[b.id] ?? 0).getTime();
        return bTime - aTime;
      });
  }, [ageFilter, data, firstSeen]);

  return (
    <main>
      <header className="hero hero-compact">
        <div className="hero-inner">
          <div>
            <p className="eyebrow">RENTAL DISCOVERY HISTORY</p>
            <h1>New listings</h1>
            <p className="hero-copy">
              See how recently each current rental first appeared on this device. Diary downloads do not reset these ages.
            </p>
          </div>
        </div>
      </header>

      <section className="shell">
        <div className="status-bar">
          <div className="status-primary">
            <strong>{visibleRentals.length}</strong>
            <span> in this age range</span>
            <span className="source-summary">· {pendingDiaryIds.size} still new for next diary</span>
          </div>
          <div className="status-meta">
            <span>{lastDiary ? `Last diary ${checkedLabel(lastDiary)}` : "No diary downloaded yet"}</span>
            <button className="refresh-inline" onClick={() => void load(true)} disabled={loading}>
              <span className={loading ? "spin" : ""}>↻</span> {loading ? "Checking" : "Refresh"}
            </button>
          </div>
        </div>

        <section
          className="search-panel"
          aria-label="Filter new rentals by age"
          style={{ paddingBottom: 18 }}
        >
          <div className="search-panel-heading">
            <div>
              <p className="region-index-eyebrow">FILTER BY AGE</p>
              <h2>How new?</h2>
            </div>
            <span>Newest first</span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              paddingBottom: 4,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {AGE_FILTERS.map((filter) => {
              const active = ageFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setAgeFilter(filter.id)}
                  aria-pressed={active}
                  style={{
                    flex: "0 0 auto",
                    border: active ? "1px solid #173f2d" : "1px solid #d5e0d9",
                    borderRadius: 999,
                    padding: "9px 12px",
                    background: active ? "#173f2d" : "white",
                    color: active ? "white" : "#234b36",
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  {filter.label} · {ageCounts[filter.id] ?? 0}
                </button>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 14,
              padding: "11px 13px",
              border: "1px solid #cfe7d8",
              borderRadius: 12,
              background: "#f4fbf6",
            }}
          >
            <span style={{ color: "#315b43", fontWeight: 750 }}>
              <strong>Age stays recorded.</strong> The green diary status disappears only after the next successful diary download.
            </span>
            {onOpenRentals && (
              <button type="button" onClick={onOpenRentals} style={{ fontWeight: 850 }}>
                Open rentals & diary →
              </button>
            )}
          </div>
        </section>

        {error && <div className="error-banner">{error}</div>}

        <div className="feed-heading">
          <div>
            <h2>{AGE_FILTERS.find((filter) => filter.id === ageFilter)?.label ?? "New"} listings</h2>
            <p>{visibleRentals.length} current rentals · sorted by first-seen age</p>
          </div>
          <span className="trust-note">Age means first observed by this browser, not the agent's official listing date.</span>
        </div>

        {loading && !data ? (
          <div className="empty-state">Building your new-listing history…</div>
        ) : visibleRentals.length ? (
          <section className="rental-grid">
            {visibleRentals.map((rental) => {
              const waitingForDiary = pendingDiaryIds.has(rental.id);
              const price = rental.rent ? `${money.format(rental.rent)}/wk` : "Rent TBC";
              const photos = rental.imageUrls?.length
                ? rental.imageUrls
                : rental.imageUrl
                  ? [rental.imageUrl]
                  : [];

              return (
                <article
                  className="rental-card"
                  key={rental.id}
                  style={waitingForDiary ? { border: "2px solid #168447" } : undefined}
                >
                  {photos[0] ? (
                    <div className="photo-gallery" style={{ overflow: "hidden" }}>
                      <div className="photo-slide">
                        <img src={photos[0]} alt={rental.address} loading="lazy" />
                        <div className="source-pill">{rental.source}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="rental-photo-empty">
                      <span>🏠</span>
                      <div className="source-pill">{rental.source}</div>
                    </div>
                  )}

                  <div className="rental-body">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 9 }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "6px 9px",
                          borderRadius: 999,
                          background: "#eef4ff",
                          color: "#244e7a",
                          border: "1px solid #c7d9ef",
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        🕒 {ageLabel(firstSeen[rental.id])}
                      </span>

                      {waitingForDiary && (
                        <span
                          style={{
                            display: "inline-flex",
                            padding: "6px 9px",
                            borderRadius: 999,
                            background: "#dff7e8",
                            color: "#0c6131",
                            border: "1px solid #9bd7b2",
                            fontSize: 12,
                            fontWeight: 950,
                          }}
                        >
                          ✨ NEW FOR NEXT DIARY
                        </span>
                      )}
                    </div>

                    <div className="price-row">
                      <strong>{price}</strong>
                      <span>{rental.suburb ?? rental.area ?? rental.region ?? "Rental"}</span>
                    </div>

                    <h2>{rental.address}</h2>

                    <div className="source-freshness">
                      <span>{rental.source}</span>
                      <span>Last checked {checkedLabel(rental.checkedAt)}</span>
                    </div>

                    <div className="feature-scroll" aria-label="Rental features">
                      {rental.bedrooms != null && <span className="feature-chip">🛏 {rental.bedrooms} bed</span>}
                      {rental.bathrooms != null && <span className="feature-chip">🛁 {rental.bathrooms} bath</span>}
                      {rental.parking != null && rental.parking > 0 && <span className="feature-chip">🚗 {rental.parking} parking</span>}
                    </div>

                    <div className="card-actions">
                      <a href={rental.url} target="_blank" rel="noreferrer" className="listing-link">
                        Original listing ↗
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="empty-state">
            <strong>No current rentals in this age range.</strong>
            <span>Choose a wider age filter or refresh the feed.</span>
          </div>
        )}
      </section>
    </main>
  );
}
