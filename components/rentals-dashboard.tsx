"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  priceBandCounts,
  RENT_PRICE_BANDS,
  rentPriceBandFor,
} from "@/lib/rentals/price-bands";
import { RENTAL_REGIONS, rentalRegionSlug } from "@/lib/rentals/regions";
import { rentalSourceDirectory } from "@/lib/rentals/source-directory";
import type { Rental, RentalsResponse } from "@/lib/rentals/types";

const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  maximumFractionDigits: 0,
});

type SortOption = "rent-asc" | "rent-desc" | "beds-desc" | "checked-desc";

type RentalsDashboardProps = {
  initialRegion?: string;
};

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

function RentalCard({
  rental,
  saved,
  onToggleSaved,
  onShare,
}: {
  rental: Rental;
  saved: boolean;
  onToggleSaved: (id: string) => void;
  onShare: (rental: Rental) => void;
}) {
  const price = rental.rent ? `${money.format(rental.rent)}/wk` : "Rent TBC";
  const featureLabels = [
    rental.bedrooms != null ? `🛏 ${rental.bedrooms} bed${rental.bedrooms === 1 ? "" : "s"}` : "",
    rental.bathrooms != null ? `🛁 ${rental.bathrooms} bath${rental.bathrooms === 1 ? "" : "s"}` : "",
    rental.parking != null && rental.parking > 0 ? `🚗 ${rental.parking} parking` : "",
    rental.propertyType && rental.propertyType !== "Private rental" ? rental.propertyType : "",
    ...(rental.features ?? []),
  ].filter(Boolean);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(rental.address)}`;

  return (
    <article className={`rental-card region-card region-${rentalRegionSlug(rental.region)}`}>
      <RentalPhotos rental={rental} />

      <div className="rental-body">
        <div className="price-row">
          <strong>{price}</strong>
          <span>{rental.suburb ?? rental.area ?? rental.region ?? "Rental"}</span>
        </div>

        <h2>{rental.address}</h2>

        <div className="source-freshness">
          <span>{rental.source}</span>
          <span>Checked {formatCheckedAt(rental.checkedAt)}</span>
        </div>

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
          <span className={`region-label region-label-${rentalRegionSlug(rental.region)}`}>
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

        <div className="card-actions">
          <button type="button" onClick={() => onToggleSaved(rental.id)} aria-pressed={saved}>
            {saved ? "♥ Saved" : "♡ Save"}
          </button>
          <button type="button" onClick={() => onShare(rental)}>Share</button>
          <a href={mapUrl} target="_blank" rel="noreferrer">Map ↗</a>
          <a href={rental.url} target="_blank" rel="noreferrer" className="listing-link">
            Original ↗
          </a>
        </div>
      </div>
    </article>
  );
}

export function RentalsDashboard({ initialRegion }: RentalsDashboardProps) {
  const initialLocation = initialRegion ? `region:${initialRegion}` : "all";
  const [data, setData] = useState<RentalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minBeds, setMinBeds] = useState("0");
  const [location, setLocation] = useState(initialLocation);
  const [sort, setSort] = useState<SortOption>("rent-asc");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("q") ?? "");
    setMaxRent(params.get("max") ?? "");
    setMinBeds(params.get("beds") ?? "0");
    setLocation(params.get("location") ?? initialLocation);
    const requestedSort = params.get("sort") as SortOption | null;
    if (["rent-asc", "rent-desc", "beds-desc", "checked-desc"].includes(requestedSort ?? "")) {
      setSort(requestedSort as SortOption);
    }
    setSavedOnly(params.get("saved") === "1");

    try {
      const stored = JSON.parse(localStorage.getItem("rental-finder-saved-listings") ?? "[]") as string[];
      setSavedIds(Array.isArray(stored) ? stored : []);
    } catch {
      setSavedIds([]);
    }
    setFiltersReady(true);
  }, [initialLocation]);

  useEffect(() => {
    if (!filtersReady) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (location !== initialLocation) params.set("location", location);
    if (maxRent) params.set("max", maxRent);
    if (minBeds !== "0") params.set("beds", minBeds);
    if (sort !== "rent-asc") params.set("sort", sort);
    if (savedOnly) params.set("saved", "1");
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [filtersReady, initialLocation, location, maxRent, minBeds, savedOnly, search, sort]);

  const suburbOptions = useMemo(() => {
    const suburbs = new Set(
      (data?.rentals ?? [])
        .map((rental) => rental.suburb?.trim())
        .filter((value): value is string => Boolean(value)),
    );
    [
      "Blenheim Central",
      "Nelson City",
      "Kaikōura",
      "Christchurch Central",
      "Wellington Central",
      "Dunedin Central",
      "Invercargill",
      "Timaru Central",
      "Queenstown",
      "Ashburton",
    ].forEach((area) => suburbs.add(area));
    return [...suburbs].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const regionCounts = useMemo(() => {
    const counts = Object.fromEntries(RENTAL_REGIONS.map((region) => [region.name, 0])) as Record<string, number>;

    for (const rental of data?.rentals ?? []) {
      const region = RENTAL_REGIONS.find(
        (candidate) => candidate.name.toLowerCase() === (rental.region ?? "Marlborough").toLowerCase(),
      );
      if (region) counts[region.name] += 1;
    }

    return counts;
  }, [data]);

  const rentals = useMemo(() => {
    const query = search.trim().toLowerCase();
    const max = maxRent ? Number(maxRent) : Number.POSITIVE_INFINITY;
    const beds = Number(minBeds);
    const savedSet = new Set(savedIds);

    const filtered = [...(data?.rentals ?? [])].filter((rental) => {
      const searchable = `${rental.address} ${rental.suburb ?? ""} ${rental.area ?? ""} ${rental.region ?? ""} ${rental.propertyManager ?? ""} ${rental.contactName ?? ""}`.toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesRent = rental.rent == null || rental.rent <= max;
      const matchesBeds = rental.bedrooms == null || rental.bedrooms >= beds;
      const matchesSaved = !savedOnly || savedSet.has(rental.id);

      let matchesLocation = true;
      if (location.startsWith("region:")) {
        matchesLocation =
          (rental.region ?? "Marlborough").toLowerCase() === location.slice(7).toLowerCase();
      } else if (location.startsWith("suburb:")) {
        const wanted = location.slice(7).toLowerCase();
        matchesLocation =
          rental.suburb?.toLowerCase() === wanted || rental.address.toLowerCase().includes(wanted);
      }

      return matchesSearch && matchesRent && matchesBeds && matchesSaved && matchesLocation;
    });

    return filtered.sort((a, b) => {
      if (sort === "rent-desc") return (b.rent ?? -1) - (a.rent ?? -1);
      if (sort === "beds-desc") return (b.bedrooms ?? -1) - (a.bedrooms ?? -1);
      if (sort === "checked-desc") {
        return new Date(b.checkedAt ?? 0).getTime() - new Date(a.checkedAt ?? 0).getTime();
      }
      return (a.rent ?? Number.MAX_SAFE_INTEGER) - (b.rent ?? Number.MAX_SAFE_INTEGER);
    });
  }, [data, location, maxRent, minBeds, savedIds, savedOnly, search, sort]);

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

  const activeSourceCount = data?.sources.filter(
    (source) => source.configured && source.ok && source.count > 0,
  ).length ?? 0;
  const configuredSources = data?.sources.filter((source) => source.configured) ?? [];
  const demoMode = configuredSources.some((source) => source.source === "Demo listings");

  const flash = useCallback((message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2200);
  }, []);

  const buildShareUrl = useCallback(() => {
    const url = new URL("/", window.location.origin);
    if (search.trim()) url.searchParams.set("q", search.trim());
    if (location !== "all") url.searchParams.set("location", location);
    if (maxRent) url.searchParams.set("max", maxRent);
    if (minBeds !== "0") url.searchParams.set("beds", minBeds);
    if (sort !== "rent-asc") url.searchParams.set("sort", sort);
    if (savedOnly) url.searchParams.set("saved", "1");
    return url.toString();
  }, [location, maxRent, minBeds, savedOnly, search, sort]);

  const shareSearch = useCallback(async () => {
    const url = buildShareUrl();
    try {
      if (navigator.share) {
        await navigator.share({ title: "Rental Finder search", url });
      } else {
        await navigator.clipboard.writeText(url);
        flash("Search link copied");
      }
    } catch {
      // Native share sheets can be dismissed without needing an error message.
    }
  }, [buildShareUrl, flash]);

  const saveSearch = useCallback(() => {
    const url = buildShareUrl();
    try {
      const existing = JSON.parse(localStorage.getItem("rental-finder-saved-searches") ?? "[]") as string[];
      const next = Array.from(new Set([url, ...(Array.isArray(existing) ? existing : [])])).slice(0, 12);
      localStorage.setItem("rental-finder-saved-searches", JSON.stringify(next));
      flash("Search saved on this device");
    } catch {
      flash("Could not save this search");
    }
  }, [buildShareUrl, flash]);

  const toggleSaved = useCallback((id: string) => {
    setSavedIds((current) => {
      const next = current.includes(id) ? current.filter((savedId) => savedId !== id) : [id, ...current];
      localStorage.setItem("rental-finder-saved-listings", JSON.stringify(next));
      return next;
    });
  }, []);

  const shareRental = useCallback(async (rental: Rental) => {
    const title = `${rental.address}${rental.rent ? ` · ${money.format(rental.rent)}/wk` : ""}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text: "Rental listing", url: rental.url });
      } else {
        await navigator.clipboard.writeText(rental.url);
        flash("Listing link copied");
      }
    } catch {
      // User dismissed native share sheet.
    }
  }, [flash]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setMaxRent("");
    setMinBeds("0");
    setLocation(initialLocation);
    setSort("rent-asc");
    setSavedOnly(false);
  }, [initialLocation]);

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

  return (
    <main>
      <header className="hero hero-compact">
        <div className="hero-inner">
          <div>
            <p className="eyebrow">NZ REGIONAL RENTALS · MULTIPLE SOURCES</p>
            <h1>Rental Finder</h1>
            <p className="hero-copy">
              One place to search regional rentals, compare the essentials and jump straight to the original listing.
            </p>
          </div>
        </div>
      </header>

      <section className="shell">
        <div className="status-bar">
          <div className="status-primary">
            <strong>{data?.total ?? 0}</strong>
            <span> current rentals</span>
            {data && <span className="source-summary">· {activeSourceCount} active sources</span>}
          </div>
          <div className="status-meta">
            <span>Checked {formatCheckedAt(data?.checkedAt)}</span>
            <button className="refresh-inline" onClick={() => void load(true)} disabled={loading}>
              <span className={loading ? "spin" : ""}>↻</span> {loading ? "Checking" : "Refresh"}
            </button>
          </div>
        </div>

        <section className="search-panel" aria-label="Search rentals">
          <div className="search-panel-heading">
            <div>
              <p className="region-index-eyebrow">FIND A HOME</p>
              <h2>Where do you want to live?</h2>
            </div>
            <span>{rentals.length} matches</span>
          </div>

          <div className="filters filters-primary">
            <label className="search-field">
              <span>Search</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Suburb, address or property manager"
              />
            </label>

            <label>
              <span>Area</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="all">All areas</option>
                <optgroup label="Regions">
                  {RENTAL_REGIONS.map((region) => (
                    <option key={region.name} value={`region:${region.name}`}>
                      {region.name}
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
              <span>Max rent / week</span>
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
              <span>Bedrooms</span>
              <select value={minBeds} onChange={(event) => setMinBeds(event.target.value)}>
                <option value="0">Any</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </select>
            </label>

            <label>
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
                <option value="rent-asc">Lowest rent</option>
                <option value="rent-desc">Highest rent</option>
                <option value="beds-desc">Most bedrooms</option>
                <option value="checked-desc">Recently checked</option>
              </select>
            </label>
          </div>

          <div className="search-actions">
            <button type="button" className="primary-action" onClick={() => void shareSearch()}>Share search</button>
            <button type="button" onClick={saveSearch}>Save search</button>
            <button
              type="button"
              className={savedOnly ? "active" : ""}
              onClick={() => setSavedOnly((value) => !value)}
              aria-pressed={savedOnly}
            >
              ♥ Saved {savedIds.length ? `(${savedIds.length})` : ""}
            </button>
            <button type="button" onClick={clearFilters}>Clear</button>
            {feedback && <span className="action-feedback" role="status">{feedback}</span>}
          </div>
        </section>

        <nav className="region-index-panel region-index-compact" aria-label="Browse rental regions">
          <div className="region-index-heading">
            <div>
              <p className="region-index-eyebrow">BROWSE BY REGION</p>
              <h2>Regional rental pages</h2>
            </div>
            <span>Shareable pages for each market</span>
          </div>

          <div className="region-index-grid">
            <a
              href="/"
              className={`region-index-card region-index-all ${location === "all" ? "active" : ""}`}
            >
              <span>All areas</span>
              <strong>{data?.rentals.length ?? 0}</strong>
            </a>

            {RENTAL_REGIONS.map((region) => (
              <a
                href={`/rentals/${region.slug}`}
                key={region.name}
                className={`region-index-card region-index-${region.slug} ${location === `region:${region.name}` ? "active" : ""} ${regionCounts[region.name] === 0 ? "empty-region" : ""}`}
              >
                <span>{region.name}</span>
                <strong>{regionCounts[region.name]}</strong>
                {regionCounts[region.name] === 0 && <small>No current listings</small>}
              </a>
            ))}
          </div>
        </nav>

        {demoMode && (
          <div className="notice">
            <strong>Demo mode is on.</strong> Sample listings are being shown alongside configured sources.
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        <details className="export-disclosure">
          <summary>Housing diary tools <span>Export filtered rentals to a CMM housing-search diary</span></summary>
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
        </details>

        <div className="feed-heading">
          <div>
            <h2>Available homes</h2>
            <p>{rentals.length} matching your filters</p>
          </div>
          <span className="trust-note">Always confirm availability on the original listing.</span>
        </div>

        {loading && !data ? (
          <div className="empty-state">Checking current listings…</div>
        ) : rentals.length ? (
          <section className="rental-grid">
            {rentals.map((rental) => (
              <RentalCard
                key={rental.id}
                rental={rental}
                saved={savedIds.includes(rental.id)}
                onToggleSaved={toggleSaved}
                onShare={(item) => void shareRental(item)}
              />
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
              <h2>Listing coverage</h2>
              <p>{activeSourceCount} active sources. Each feed is isolated so one failure does not break the whole search.</p>
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
              <h2>More rental sources</h2>
              <p>
                Major sites that are not automatically connected remain one tap away. API or permission-only sources stay disabled until a permitted integration is available.
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
