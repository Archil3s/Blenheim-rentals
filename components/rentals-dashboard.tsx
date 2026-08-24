"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  priceBandCounts,
  RENT_PRICE_BANDS,
  rentPriceBandFor,
} from "@/lib/rentals/price-bands";
import { RENTAL_REGIONS, rentalRegionSlug } from "@/lib/rentals/regions";
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

function DiaryRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="diary-row">
      <span>{label}</span>
      <strong>{value || "Not provided"}</strong>
    </div>
  );
}

function RentalPhotos({ rental }: { rental: Rental }) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const photos = rental.imageUrls?.length
    ? rental.imageUrls
    : rental.imageUrl
      ? [rental.imageUrl]
      : [];

  const movePhoto = (direction: -1 | 1) => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    gallery.scrollBy({
      left: direction * gallery.clientWidth,
      behavior: "smooth",
    });
  };

  if (photos.length === 0) {
    return (
      <div className="rental-photo-empty">
        <span>🏠</span>
        <div className="source-pill">{rental.source}</div>
      </div>
    );
  }

  const arrowStyle = {
    position: "absolute" as const,
    top: "50%",
    zIndex: 4,
    display: "grid",
    width: 46,
    height: 46,
    placeItems: "center",
    transform: "translateY(-50%)",
    border: "1px solid rgba(20, 61, 42, 0.18)",
    borderRadius: 999,
    color: "#143d2a",
    background: "rgba(255, 255, 255, 0.92)",
    boxShadow: "0 5px 18px rgba(0, 0, 0, 0.2)",
    fontSize: "2rem",
    fontWeight: 800,
    lineHeight: 1,
    cursor: "pointer",
    backdropFilter: "blur(8px)",
  };

  return (
    <div style={{ position: "relative" }}>
      <div ref={galleryRef} className="photo-gallery" aria-label={`Photos of ${rental.address}`}>
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

      {photos.length > 1 && (
        <>
          <button
            type="button"
            aria-label={`Previous photo of ${rental.address}`}
            title="Previous photo"
            onClick={() => movePhoto(-1)}
            style={{ ...arrowStyle, left: 10 }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={`Next photo of ${rental.address}`}
            title="Next photo"
            onClick={() => movePhoto(1)}
            style={{ ...arrowStyle, right: 10 }}
          >
            ›
          </button>
        </>
      )}
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
              <span className="feature-chip" key={feature}>{feature}</span>
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
            <DiaryRow label="Property type / price" value={`${rental.propertyType ?? "Private rental"} · ${price}`} />
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
          <a href={rental.url} target="_blank" rel="noreferrer" className="listing-link">Original ↗</a>
        </div>
      </div>
    </article>
  );
}

function locationMatches(rental: Rental, location: string) {
  if (location === "all") return true;
  if (location.startsWith("region:")) {
    return (rental.region ?? "Marlborough").toLowerCase() === location.slice(7).toLowerCase();
  }
  if (location.startsWith("suburb:")) {
    const wanted = location.slice(7).toLowerCase();
    return rental.suburb?.toLowerCase() === wanted || rental.address.toLowerCase().includes(wanted);
  }
  return true;
}

function locationLabel(value: string) {
  if (value.startsWith("region:")) return value.slice(7);
  if (value.startsWith("suburb:")) return value.slice(7);
  return "All areas";
}

export function RentalsDashboard({ initialRegion }: RentalsDashboardProps) {
  const initialLocation = initialRegion ? `region:${initialRegion}` : "all";
  const initialLocations = useMemo(
    () => (initialLocation === "all" ? [] : [initialLocation]),
    [initialLocation],
  );

  const [data, setData] = useState<RentalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minBeds, setMinBeds] = useState("0");
  const [selectedLocations, setSelectedLocations] = useState<string[]>(initialLocations);
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
      const response = await fetch(`/api/rentals${force ? "?refresh=1" : ""}`, { cache: "no-store" });
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

    const locations = params.getAll("location").filter(Boolean);
    if (locations.length > 0) {
      setSelectedLocations(locations.filter((value) => value !== "all"));
    } else {
      const oldSingle = params.get("location");
      setSelectedLocations(oldSingle && oldSingle !== "all" ? [oldSingle] : initialLocations);
    }

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
  }, [initialLocation, initialLocations]);

  useEffect(() => {
    if (!filtersReady) return;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());

    const initialOnly =
      selectedLocations.length === initialLocations.length &&
      selectedLocations.every((value) => initialLocations.includes(value));

    if (!initialOnly) {
      selectedLocations.forEach((location) => params.append("location", location));
    }

    if (maxRent) params.set("max", maxRent);
    if (minBeds !== "0") params.set("beds", minBeds);
    if (sort !== "rent-asc") params.set("sort", sort);
    if (savedOnly) params.set("saved", "1");
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(null, "", nextUrl);
  }, [filtersReady, initialLocations, maxRent, minBeds, savedOnly, search, selectedLocations, sort]);

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

  const toggleLocation = useCallback((value: string) => {
    setSelectedLocations((current) =>
      current.includes(value)
        ? current.filter((location) => location !== value)
        : [...current, value],
    );
  }, []);

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
      const matchesLocation =
        selectedLocations.length === 0 ||
        selectedLocations.some((location) => locationMatches(rental, location));

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
  }, [data, maxRent, minBeds, savedIds, savedOnly, search, selectedLocations, sort]);

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
    selectedLocations.forEach((location) => url.searchParams.append("location", location));
    if (maxRent) url.searchParams.set("max", maxRent);
    if (minBeds !== "0") url.searchParams.set("beds", minBeds);
    if (sort !== "rent-asc") url.searchParams.set("sort", sort);
    if (savedOnly) url.searchParams.set("saved", "1");
    return url.toString();
  }, [maxRent, minBeds, savedOnly, search, selectedLocations, sort]);

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
      // Native share sheets can be dismissed.
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
    setSelectedLocations(initialLocations);
    setSort("rent-asc");
    setSavedOnly(false);
  }, [initialLocations]);

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

  const locationSummary =
    selectedLocations.length === 0
      ? "All areas"
      : selectedLocations.length === 1
        ? locationLabel(selectedLocations[0])
        : `${selectedLocations.length} areas selected`;

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

            <div style={{ display: "grid", gap: 8 }}>
              <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontWeight: 800 }}>Locations</span>
              <details
                style={{
                  position: "relative",
                  minHeight: 48,
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  background: "white",
                }}
              >
                <summary
                  style={{
                    minHeight: 48,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 13px",
                    cursor: "pointer",
                    listStyle: "none",
                    fontWeight: 700,
                  }}
                >
                  <span>{locationSummary}</span>
                  <span>⌄</span>
                </summary>
                <div
                  style={{
                    position: "absolute",
                    zIndex: 20,
                    top: "calc(100% + 6px)",
                    left: 0,
                    width: "min(360px, 90vw)",
                    maxHeight: 360,
                    overflowY: "auto",
                    padding: 12,
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                    background: "white",
                    boxShadow: "0 14px 35px rgba(24,49,35,.16)",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <button type="button" onClick={() => setSelectedLocations([])}>All areas</button>
                    <button
                      type="button"
                      onClick={() => setSelectedLocations(RENTAL_REGIONS.map((region) => `region:${region.name}`))}
                    >
                      All regions
                    </button>
                  </div>

                  <strong style={{ display: "block", marginBottom: 6 }}>Regions</strong>
                  <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                    {RENTAL_REGIONS.map((region) => {
                      const value = `region:${region.name}`;
                      return (
                        <label key={region.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes(value)}
                            onChange={() => toggleLocation(value)}
                          />
                          <span style={{ flex: 1 }}>{region.name}</span>
                          <small>{regionCounts[region.name]}</small>
                        </label>
                      );
                    })}
                  </div>

                  <strong style={{ display: "block", marginBottom: 6 }}>Suburbs / areas</strong>
                  <div style={{ display: "grid", gap: 6 }}>
                    {suburbOptions.map((suburb) => {
                      const value = `suburb:${suburb}`;
                      return (
                        <label key={suburb} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes(value)}
                            onChange={() => toggleLocation(value)}
                          />
                          <span>{suburb}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </details>
            </div>

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

          {selectedLocations.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "-14px 0 18px" }}>
              {selectedLocations.map((location) => (
                <button
                  type="button"
                  key={location}
                  onClick={() => toggleLocation(location)}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  {locationLabel(location)} ×
                </button>
              ))}
            </div>
          )}

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
            <a href="/" className={`region-index-card region-index-all ${selectedLocations.length === 0 ? "active" : ""}`}>
              <span>All areas</span>
              <strong>{data?.rentals.length ?? 0}</strong>
            </a>

            {RENTAL_REGIONS.map((region) => {
              const selected = selectedLocations.includes(`region:${region.name}`);
              return (
                <a
                  href={`/rentals/${region.slug}`}
                  key={region.name}
                  className={`region-index-card region-index-${region.slug} ${selected ? "active" : ""} ${regionCounts[region.name] === 0 ? "empty-region" : ""}`}
                >
                  <span>{region.name}</span>
                  <strong>{regionCounts[region.name]}</strong>
                  {regionCounts[region.name] === 0 && <small>No current listings</small>}
                </a>
              );
            })}
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
                Tick the weekly rent bands you want. Your selected locations ({locationSummary}), search,
                maximum-rent and bedroom filters above automatically apply to this diary export.
              </p>

              <div className="band-actions">
                <button type="button" onClick={() => setSelectedBands(RENT_PRICE_BANDS.map((band) => band.id))}>
                  Select all
                </button>
                <button type="button" onClick={() => setSelectedBands([])}>Clear all</button>
              </div>

              <div className="price-band-grid" aria-label="Rental price-band filters">
                {diaryBands.map((band) => {
                  const checked = selectedBands.includes(band.id);
                  return (
                    <label
                      key={band.id}
                      className={`price-band price-band-check ${checked ? "selected" : ""} ${band.count ? "has-results" : "empty"}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleBand(band.id)} />
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
                {exporting ? "Creating diary…" : `Download ${diaryRentals.length || ""} matching listings`}
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
      </section>
    </main>
  );
}
