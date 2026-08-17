"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  priceBandCounts,
  RENT_PRICE_BANDS,
  rentPriceBandFor,
} from "@/lib/rentals/price-bands";
import { rentalSourceDirectory } from "@/lib/rentals/source-directory";
import type { Rental, RentalsResponse } from "@/lib/rentals/types";

const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

const PINNED_REGIONS = [
  "Blenheim Central",
  "Springlands",
  "Redwoodtown",
  "Witherlea",
  "Mayfield",
  "Riversdale",
  "Burleigh",
  "Riverlands",
  "Grovetown",
  "Renwick",
  "Rarangi",
  "Picton",
];

function formatCheckedAt(value?: string) {
  if (!value) return "Not checked yet";

  return new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function accessLabel(access: "live" | "api" | "permission" | "manual") {
  if (access === "live") return "LIVE";
  if (access === "api") return "API";
  if (access === "permission") return "PERMISSION";
  return "OPEN SITE";
}

function normaliseRegion(value?: string) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function rentalRegion(rental: Rental) {
  if (rental.suburb?.trim()) return rental.suburb.trim();

  const addressParts = rental.address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (addressParts.length > 1) return addressParts.at(-1) ?? "Marlborough";

  return rental.area?.trim() || "Marlborough";
}

function DiaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="diary-row">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function RentalCard({ rental }: { rental: Rental }) {
  const rating =
    rental.rating != null
      ? `${"★".repeat(rental.rating)}${"☆".repeat(Math.max(0, 5 - rental.rating))}`
      : "Not rated";
  const price = rental.rent ? `${money.format(rental.rent)}/wk` : "Rent TBC";

  return (
    <article className="rental-card">
      <div
        className="rental-image"
        style={rental.imageUrl ? { backgroundImage: `url(${rental.imageUrl})` } : undefined}
        aria-label={rental.imageUrl ? `Photo of ${rental.address}` : undefined}
      >
        {!rental.imageUrl && <span>🏠</span>}
        <div className="source-pill">{rental.source}</div>
      </div>

      <div className="rental-body">
        <div className="price-row">
          <strong>{price}</strong>
          <span>{rental.suburb ?? rental.area ?? "Blenheim"}</span>
        </div>

        <h2>{rental.address}</h2>

        <div className="facts" aria-label="Property details">
          <span>🛏 {rental.bedrooms ?? "–"} beds</span>
          <span>🛁 {rental.bathrooms ?? "–"} baths</span>
        </div>

        <div className="manager-line">
          <span>Property manager</span>
          <strong>{rental.propertyManager ?? rental.source}</strong>
        </div>

        <details className="diary-details">
          <summary>Housing diary fields</summary>
          <div className="diary-grid">
            <DiaryRow label="Checked" value={formatCheckedAt(rental.checkedAt)} />
            <DiaryRow label="Contact type / how found" value={rental.contactType} />
            <DiaryRow
              label="Property type / price"
              value={`${rental.propertyType ?? "Private rental"} · ${price}`}
            />
            <DiaryRow label="Property address" value={rental.address} />
            <DiaryRow label="Property manager" value={rental.propertyManager ?? rental.source} />
            <DiaryRow label="Contact person" value={rental.contactName} />
            <DiaryRow label="Phone" value={rental.contactPhone} />
            <DiaryRow label="Email" value={rental.contactEmail} />
            <DiaryRow label="Notes" value={rental.notes} />
            <DiaryRow label="Rating" value={rating} />
          </div>
        </details>

        <a href={rental.url} target="_blank" rel="noreferrer" className="listing-link">
          View original listing ↗
        </a>
      </div>
    </article>
  );
}

export function RentalsDashboard() {
  const [data, setData] = useState<RentalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [roomSize, setRoomSize] = useState("any");
  const [region, setRegion] = useState("all-marlborough");
  const [selectedBands, setSelectedBands] = useState<string[]>(() =>
    RENT_PRICE_BANDS.map((band) => band.id),
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rentals${force ? "?refresh=1" : ""}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Could not load rentals");

      const payload = (await response.json()) as RentalsResponse;
      setData(payload);
    } catch {
      setError("The rental feed could not be refreshed. Try again shortly.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const regionOptions = useMemo(() => {
    const regions = new Map<string, string>();

    for (const pinned of PINNED_REGIONS) {
      regions.set(normaliseRegion(pinned), pinned);
    }

    for (const rental of data?.rentals ?? []) {
      const label = rentalRegion(rental);
      const key = normaliseRegion(label);
      if (key && key !== "marlborough") regions.set(key, label);
    }

    const pinnedKeys = new Set(PINNED_REGIONS.map(normaliseRegion));
    const discovered = [...regions.entries()]
      .filter(([key]) => !pinnedKeys.has(key))
      .map(([, label]) => label)
      .sort((a, b) => a.localeCompare(b));

    return [...PINNED_REGIONS, ...discovered];
  }, [data]);

  const rentals = useMemo(() => {
    const query = search.trim().toLowerCase();
    const max = maxRent ? Number(maxRent) : Number.POSITIVE_INFINITY;

    return [...(data?.rentals ?? [])]
      .filter((rental) => {
        const searchable = `${rental.address} ${rental.suburb ?? ""} ${rental.area ?? ""} ${rental.propertyManager ?? ""} ${rental.contactName ?? ""}`.toLowerCase();
        const matchesSearch = !query || searchable.includes(query);
        const matchesRent = rental.rent == null || rental.rent <= max;

        const matchesRoom =
          roomSize === "any" ||
          (roomSize === "unknown" && (rental.bedrooms == null || rental.bedrooms === 0)) ||
          (roomSize === "4plus" && rental.bedrooms != null && rental.bedrooms >= 4) ||
          (!Number.isNaN(Number(roomSize)) && rental.bedrooms === Number(roomSize));

        const matchesRegion =
          region === "all-marlborough" ||
          normaliseRegion(rentalRegion(rental)) === normaliseRegion(region);

        return matchesSearch && matchesRent && matchesRoom && matchesRegion;
      })
      .sort((a, b) => (a.rent ?? Number.MAX_SAFE_INTEGER) - (b.rent ?? Number.MAX_SAFE_INTEGER));
  }, [data, search, maxRent, roomSize, region]);

  const diaryBands = useMemo(() => priceBandCounts(rentals), [rentals]);

  const diaryRentals = useMemo(() => {
    const selected = new Set(selectedBands);
    return rentals.filter((rental) => {
      const band = rentPriceBandFor(rental.rent);
      return band ? selected.has(band.id) : false;
    });
  }, [rentals, selectedBands]);

  const diaryPages = Math.ceil(diaryRentals.length / 7);
  const representedBands = diaryBands.filter(
    (band) => band.count > 0 && selectedBands.includes(band.id),
  ).length;

  const toggleBand = useCallback((bandId: string) => {
    setSelectedBands((current) =>
      current.includes(bandId)
        ? current.filter((id) => id !== bandId)
        : [...current, bandId],
    );
  }, []);

  const exportDiary = useCallback(async () => {
    if (diaryRentals.length === 0) return;

    setExporting(true);
    setExportError(null);

    try {
      const response = await fetch("/api/housing-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rentalIds: diaryRentals.map((rental) => rental.id),
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
    } catch (exportFailure) {
      setExportError(
        exportFailure instanceof Error ? exportFailure.message : "Could not create housing diary",
      );
    } finally {
      setExporting(false);
    }
  }, [diaryRentals]);

  const configuredSources = data?.sources.filter((source) => source.configured) ?? [];
  const demoMode = configuredSources.some((source) => source.source === "Demo listings");

  return (
    <main>
      <header className="hero">
        <div className="hero-inner">
          <div>
            <p className="eyebrow">TE WAIHARAKEKE · MARLBOROUGH</p>
            <h1>Blenheim Rentals</h1>
            <p className="hero-copy">
              One clean view of current rentals, with housing-diary details and direct access to every major local rental source.
            </p>
          </div>

          <button className="refresh-button" onClick={() => void load(true)} disabled={loading}>
            <span className={loading ? "spin" : ""}>↻</span>
            {loading ? "Checking…" : "Refresh listings"}
          </button>
        </div>
      </header>

      <section className="shell">
        <div className="status-bar">
          <div>
            <strong>{data?.total ?? 0}</strong>
            <span> current rentals</span>
          </div>
          <div className="status-meta">
            <span>Last checked: {formatCheckedAt(data?.checkedAt)}</span>
            {data?.fromCache && <span className="cache-pill">RAM cache</span>}
          </div>
        </div>

        {demoMode && (
          <div className="notice">
            <strong>Demo mode is on.</strong> Sample listings are being shown alongside configured sources.
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <section className="filters" aria-label="Rental filters">
          <label>
            <span>Search area, address or manager</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. Springlands or Ana"
            />
          </label>

          <label>
            <span>Maximum weekly rent</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="10"
              value={maxRent}
              onChange={(event) => setMaxRent(event.target.value)}
              placeholder="Any"
            />
          </label>

          <label>
            <span>Bedroom / room size</span>
            <select value={roomSize} onChange={(event) => setRoomSize(event.target.value)}>
              <option value="any">Any room size</option>
              <option value="unknown">Studio / not stated</option>
              <option value="1">1 bedroom</option>
              <option value="2">2 bedrooms</option>
              <option value="3">3 bedrooms</option>
              <option value="4plus">4+ bedrooms</option>
            </select>
          </label>

          <label>
            <span>Region / suburb</span>
            <select value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="all-marlborough">All Marlborough</option>
              {regionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="export-panel" aria-label="Housing diary export">
          <div>
            <p className="export-eyebrow">CMM HOUSING SEARCH DIARY</p>
            <h2>Choose the price bands to include</h2>
            <p>
              Tick the weekly rent bands you want. Search, maximum rent, bedroom size and region filters above also apply to the diary export.
            </p>

            <div className="band-actions">
              <button
                type="button"
                onClick={() => setSelectedBands(RENT_PRICE_BANDS.map((band) => band.id))}
              >
                Select all
              </button>
              <button type="button" onClick={() => setSelectedBands([])}>
                Clear all
              </button>
            </div>

            <div className="price-band-grid" aria-label="Rental price-band filters">
              {diaryBands.map((band) => {
                const checked = selectedBands.includes(band.id);
                return (
                  <label
                    key={band.id}
                    className={`price-band price-band-check ${checked ? "selected" : ""} ${band.count ? "has-results" : "empty"}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBand(band.id)}
                    />
                    <span className="price-band-copy">
                      <strong>{band.label}</strong>
                      <span>{band.count} found</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="export-controls">
            <div className="export-field-list">
              <strong>Fields filled automatically</strong>
              <span>
                Date checked · Online · Private rental + price · Address · Advertised agent/property manager · Phone/email · Clickable listing link · Notes
              </span>
            </div>
            <button
              type="button"
              className="export-button"
              onClick={() => void exportDiary()}
              disabled={exporting || diaryRentals.length === 0}
            >
              {exporting
                ? "Reading listings & creating diary…"
                : `Download ${diaryRentals.length || ""} matching listings`}
            </button>
            <span className="export-count">
              {diaryRentals.length} listings selected · {diaryPages} Word {diaryPages === 1 ? "page" : "pages"} · {representedBands} price bands represented
            </span>
            {exportError && <span className="export-error">{exportError}</span>}
          </div>
        </section>

        <div className="feed-heading">
          <div>
            <h2>Available homes</h2>
            <p>{rentals.length} matching your filters</p>
          </div>
        </div>

        {loading && !data ? (
          <div className="empty-state">Checking current listings…</div>
        ) : rentals.length ? (
          <section className="rental-grid">
            {rentals.map((rental) => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </section>
        ) : (
          <div className="empty-state">
            <strong>No matching rentals.</strong>
            <span>Try widening the filters or refresh the feed.</span>
          </div>
        )}

        {data && (
          <section className="sources-panel">
            <div>
              <h2>Automatic feeds</h2>
              <p>Each source is isolated so one failure does not break the whole feed.</p>
            </div>
            <div className="source-list">
              {data.sources.map((source) => (
                <div key={source.source} className="source-row">
                  <span
                    className={`source-dot ${source.ok ? "ok" : source.configured ? "bad" : "off"}`}
                  />
                  <strong>{source.source}</strong>
                  <span>{source.configured ? `${source.count} found` : "not auto-connected"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="directory-panel">
          <div className="directory-heading">
            <div>
              <h2>All rental sites</h2>
              <p>
                Every major local source stays one tap away, including sites that require API access or permission.
              </p>
            </div>
            <span>{rentalSourceDirectory.length} sources</span>
          </div>

          <div className="directory-grid">
            {rentalSourceDirectory.map((source) => (
              <a
                key={source.name}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="directory-card"
              >
                <div className="directory-card-top">
                  <strong>{source.name}</strong>
                  <span className={`access-pill ${source.access}`}>{accessLabel(source.access)}</span>
                </div>
                <p>{source.note}</p>
                <span className="directory-link">Open rentals ↗</span>
              </a>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
