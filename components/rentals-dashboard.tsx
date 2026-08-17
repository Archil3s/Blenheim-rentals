"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  priceBandCounts,
  RENT_PRICE_BANDS,
  rentPriceBandFor,
} from "@/lib/rentals/price-bands";
import { rentalSourceDirectory } from "@/lib/rentals/source-directory";
import type { Rental, RentalsResponse } from "@/lib/rentals/types";

const REGION_OPTIONS = ["Marlborough", "Nelson", "Kaikōura", "Christchurch"] as const;

const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

function regionSlug(region?: string) {
  const value = region?.toLowerCase() ?? "marlborough";
  if (value === "nelson") return "nelson";
  if (value === "kaikōura" || value === "kaikoura") return "kaikoura";
  if (value === "christchurch") return "christchurch";
  return "marlborough";
}

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

function DiaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="diary-row">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function RentalPhotos({ rental }: { rental: Rental }) {
  const photos = rental.imageUrls?.length
    ? rental.imageUrls
    : rental.imageUrl
      ? [rental.imageUrl]
      : [];

  if (photos.length === 0) {
    return (
      <div className="rental-photo-empty">
        <span>🏠</span>
        <div className="source-pill">{rental.source}</div>
      </div>
    );
  }

  return (
    <div className="photo-gallery" aria-label={`Photos of ${rental.address}`}>
      {photos.map((photo, index) => (
        <div className="photo-slide" key={`${photo}-${index}`}>
          <img src={photo} alt={`${rental.address} photo ${index + 1}`} loading="lazy" />
          {index === 0 && <div className="source-pill">{rental.source}</div>}
          {photos.length > 1 && (
            <span className="photo-count">
              {index + 1}/{photos.length}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function RentalCard({ rental }: { rental: Rental }) {
  const price = rental.rent ? `${money.format(rental.rent)}/wk` : "Rent TBC";
  const featureLabels = [
    rental.bedrooms != null ? `🛏 ${rental.bedrooms} bed${rental.bedrooms === 1 ? "" : "s"}` : "",
    rental.bathrooms != null ? `🛁 ${rental.bathrooms} bath${rental.bathrooms === 1 ? "" : "s"}` : "",
    rental.parking != null && rental.parking > 0 ? `🚗 ${rental.parking} parking` : "",
    rental.propertyType && rental.propertyType !== "Private rental" ? rental.propertyType : "",
    ...(rental.features ?? []),
  ].filter(Boolean);

  return (
    <article className={`rental-card region-card region-${regionSlug(rental.region)}`}>
      <RentalPhotos rental={rental} />

      <div className="rental-body">
        <div className="price-row">
          <strong>{price}</strong>
          <span>{rental.suburb ?? rental.area ?? rental.region ?? "Rental"}</span>
        </div>

        <h2>{rental.address}</h2>

        {featureLabels.length > 0 && (
          <div className="feature-scroll" aria-label="House features">
            {featureLabels.map((feature) => (
              <span className="feature-chip" key={feature}>
                {feature}
              </span>
            ))}
          </div>
        )}

        <div className="location-line">
          <span className={`region-label region-label-${regionSlug(rental.region)}`}>
            {rental.region ?? "Marlborough"}
          </span>
          {rental.suburb && <span>· {rental.suburb}</span>}
        </div>

        <div className="manager-line">
          <span>Property manager</span>
          <strong>{rental.contactName ?? rental.propertyManager ?? rental.source}</strong>
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
            <DiaryRow label="Contact person" value={rental.contactName} />
            <DiaryRow label="Phone" value={rental.contactPhone} />
            <DiaryRow label="Email" value={rental.contactEmail} />
            <DiaryRow label="Notes" value={rental.notes} />
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
  const [minBeds, setMinBeds] = useState("0");
  const [location, setLocation] = useState("all");
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

  const suburbOptions = useMemo(() => {
    const suburbs = new Set(
      (data?.rentals ?? [])
        .map((rental) => rental.suburb?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    suburbs.add("Blenheim Central");
    suburbs.add("Nelson City");
    suburbs.add("Kaikōura");
    suburbs.add("Christchurch Central");
    return [...suburbs].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const regionCounts = useMemo(() => {
    const counts = Object.fromEntries(REGION_OPTIONS.map((region) => [region, 0])) as Record<
      (typeof REGION_OPTIONS)[number],
      number
    >;

    for (const rental of data?.rentals ?? []) {
      const region = REGION_OPTIONS.find(
        (candidate) => candidate.toLowerCase() === (rental.region ?? "Marlborough").toLowerCase(),
      );
      if (region) counts[region] += 1;
    }

    return counts;
  }, [data]);

  const rentals = useMemo(() => {
    const query = search.trim().toLowerCase();
    const max = maxRent ? Number(maxRent) : Number.POSITIVE_INFINITY;
    const beds = Number(minBeds);

    return [...(data?.rentals ?? [])]
      .filter((rental) => {
        const searchable = `${rental.address} ${rental.suburb ?? ""} ${rental.area ?? ""} ${rental.region ?? ""} ${rental.propertyManager ?? ""} ${rental.contactName ?? ""}`.toLowerCase();
        const matchesSearch = !query || searchable.includes(query);
        const matchesRent = rental.rent == null || rental.rent <= max;
        const matchesBeds = rental.bedrooms == null || rental.bedrooms >= beds;

        let matchesLocation = true;
        if (location.startsWith("region:")) {
          matchesLocation =
            (rental.region ?? "Marlborough").toLowerCase() === location.slice(7).toLowerCase();
        } else if (location.startsWith("suburb:")) {
          const wanted = location.slice(7).toLowerCase();
          matchesLocation =
            rental.suburb?.toLowerCase() === wanted || rental.address.toLowerCase().includes(wanted);
        }

        return matchesSearch && matchesRent && matchesBeds && matchesLocation;
      })
      .sort((a, b) => (a.rent ?? Number.MAX_SAFE_INTEGER) - (b.rent ?? Number.MAX_SAFE_INTEGER));
  }, [data, search, maxRent, minBeds, location]);

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
          rentals: diaryRentals,
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
            <p className="eyebrow">MARLBOROUGH · NELSON · KAIKŌURA · CHRISTCHURCH</p>
            <h1>Rental Finder</h1>
            <p className="hero-copy">
              Current rentals across Marlborough, Nelson, Kaikōura and Christchurch, with housing-diary details, photos, features and direct listing links.
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

        <section className="region-index-panel" aria-label="Region listing index">
          <div className="region-index-heading">
            <div>
              <p className="region-index-eyebrow">AREA INDEX</p>
              <h2>Browse rental regions</h2>
            </div>
            <span>Choose all areas or one region</span>
          </div>

          <div className="region-index-grid">
            <button
              type="button"
              className={`region-index-card region-index-all ${location === "all" ? "active" : ""}`}
              onClick={() => setLocation("all")}
            >
              <span>All areas</span>
              <strong>{data?.rentals.length ?? 0}</strong>
            </button>

            {REGION_OPTIONS.map((region) => (
              <button
                type="button"
                key={region}
                className={`region-index-card region-index-${regionSlug(region)} ${location === `region:${region}` ? "active" : ""}`}
                onClick={() => setLocation(`region:${region}`)}
              >
                <span>{region}</span>
                <strong>{regionCounts[region]}</strong>
              </button>
            ))}
          </div>
        </section>

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
              placeholder="e.g. Springlands, Kaikōura, Riccarton or Ana"
            />
          </label>

          <label>
            <span>Area</span>
            <select value={location} onChange={(event) => setLocation(event.target.value)}>
              <option value="all">All areas</option>
              <optgroup label="Regions">
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={`region:${region}`}>
                    {region}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Suburbs / areas">
                {suburbOptions.map((suburb) => (
                  <option key={suburb} value={`suburb:${suburb}`}>
                    {suburb}
                  </option>
                ))}
              </optgroup>
            </select>
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
            <span>Minimum bedrooms</span>
            <select value={minBeds} onChange={(event) => setMinBeds(event.target.value)}>
              <option value="0">Any</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </label>
        </section>

        <section className="export-panel" aria-label="Housing diary export">
          <div>
            <p className="export-eyebrow">CMM HOUSING SEARCH DIARY</p>
            <h2>Choose the price bands to include</h2>
            <p>
              Tick the weekly rent bands you want. The search, area, maximum-rent and bedroom filters above also apply to the diary export.
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
