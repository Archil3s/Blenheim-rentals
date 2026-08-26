"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GroceriesResponse, GroceryListing } from "@/lib/groceries/types";

const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type SortOption = "price-asc" | "price-desc" | "unit-asc" | "store";

type QuickSearch = {
  id: string;
  label: string;
  emoji: string;
  query: string;
};

const QUICK_SEARCHES: QuickSearch[] = [
  { id: "all", label: "All", emoji: "🛒", query: "" },
  { id: "meat", label: "Meat", emoji: "🥩", query: "meat" },
  { id: "chicken", label: "Chicken", emoji: "🍗", query: "chicken" },
  { id: "cheese", label: "Cheese", emoji: "🧀", query: "cheese" },
  { id: "keto", label: "Keto", emoji: "🥑", query: "keto" },
  { id: "eggs", label: "Eggs", emoji: "🥚", query: "eggs" },
  { id: "dairy", label: "Dairy", emoji: "🥛", query: "dairy" },
  { id: "vegetables", label: "Vegetables", emoji: "🥦", query: "vegetables" },
  { id: "fruit", label: "Fruit", emoji: "🍎", query: "fruit" },
  { id: "pantry", label: "Pantry", emoji: "🥫", query: "pantry" },
  { id: "frozen", label: "Frozen", emoji: "❄️", query: "frozen" },
  { id: "drinks", label: "Drinks", emoji: "🥤", query: "drinks" },
];

function freshness(value?: string | null) {
  if (!value) return "Latest observed price";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest observed price";
  return `Observed ${new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)}`;
}

function GroceryCard({ item }: { item: GroceryListing }) {
  return (
    <article style={{ border: "1px solid #d9e2dc", borderRadius: 18, background: "white", padding: 18, boxShadow: "0 8px 24px rgba(20,61,42,.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#52705f", fontSize: 13, fontWeight: 700 }}>{item.category ?? "Groceries"}</div>
          <h2 style={{ margin: "5px 0 4px", fontSize: 20, color: "#173f2d" }}>{item.name}</h2>
          <div style={{ color: "#66756c", fontSize: 14 }}>
            {[item.brand, item.size].filter(Boolean).join(" · ") || item.chain}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <strong style={{ display: "block", color: "#173f2d", fontSize: 24 }}>{money.format(item.price)}</strong>
          {item.unitPrice != null && (
            <span style={{ color: "#65736b", fontSize: 13 }}>
              {money.format(item.unitPrice)}{item.unitLabel ? ` / ${item.unitLabel}` : " / unit"}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
        <span style={{ borderRadius: 999, padding: "6px 10px", background: "#eef5f0", color: "#234b36", fontSize: 13, fontWeight: 700 }}>{item.chain}</span>
        <span style={{ borderRadius: 999, padding: "6px 10px", background: "#f4f5f4", color: "#4d5a52", fontSize: 13 }}>{item.store}</span>
        {item.promo && <span style={{ borderRadius: 999, padding: "6px 10px", background: "#fff3c9", color: "#735900", fontSize: 13, fontWeight: 700 }}>{item.promo}</span>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid #edf0ee" }}>
        <small style={{ color: "#718078" }}>{freshness(item.observedAt)}</small>
        {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#17663b", fontWeight: 700 }}>Source ↗</a>}
      </div>
    </article>
  );
}

export function GroceriesDashboard() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeQuickSearch, setActiveQuickSearch] = useState("all");
  const [location, setLocation] = useState("Blenheim");
  const [category, setCategory] = useState("all");
  const [chain, setChain] = useState("all");
  const [sort, setSort] = useState<SortOption>("price-asc");
  const [promoOnly, setPromoOnly] = useState(false);
  const [data, setData] = useState<GroceriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/groceries?q=${encodeURIComponent(submittedQuery)}&location=${encodeURIComponent(location)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as GroceriesResponse;
        if (!response.ok) throw new Error(payload.error ?? "Unable to load supermarket prices.");
        setData(payload);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load supermarket prices.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [submittedQuery, location]);

  const categories = useMemo(() => {
    return Array.from(new Set((data?.listings ?? []).map((item) => item.category).filter((value): value is string => Boolean(value)))).sort();
  }, [data]);

  const chains = useMemo(() => {
    return Array.from(new Set((data?.listings ?? []).map((item) => item.chain).filter(Boolean))).sort();
  }, [data]);

  const listings = useMemo(() => {
    const result = (data?.listings ?? []).filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (chain !== "all" && item.chain !== chain) return false;
      if (promoOnly && !item.promo) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "unit-asc") return (a.unitPrice ?? Number.POSITIVE_INFINITY) - (b.unitPrice ?? Number.POSITIVE_INFINITY);
      if (sort === "store") return `${a.chain} ${a.store}`.localeCompare(`${b.chain} ${b.store}`);
      return a.price - b.price;
    });
  }, [data, category, chain, promoOnly, sort]);

  function search(event: FormEvent) {
    event.preventDefault();
    const nextQuery = query.trim();
    setActiveQuickSearch("custom");
    setCategory("all");
    setSubmittedQuery(nextQuery);
  }

  function runQuickSearch(item: QuickSearch) {
    setActiveQuickSearch(item.id);
    setQuery(item.query);
    setSubmittedQuery(item.query);
    setCategory("all");
    setChain("all");
  }

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 18px 60px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ margin: 0, color: "#4e6f5b", fontWeight: 800 }}>BLENHEIM PRICE FINDER</p>
        <h1 style={{ margin: "5px 0 6px", color: "#143d2a", fontSize: "clamp(2rem,5vw,3.6rem)" }}>Supermarket prices</h1>
        <p style={{ margin: 0, color: "#66756c", maxWidth: 760 }}>Tap a food group or search for anything. Compare current observed prices across Blenheim supermarkets.</p>
      </header>

      <nav
        aria-label="Quick supermarket searches"
        style={{
          display: "flex",
          gap: 9,
          overflowX: "auto",
          padding: "4px 2px 12px",
          marginBottom: 10,
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "thin",
        }}
      >
        {QUICK_SEARCHES.map((item) => {
          const active = activeQuickSearch === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => runQuickSearch(item)}
              aria-pressed={active}
              style={{
                flex: "0 0 auto",
                minHeight: 46,
                padding: "0 15px",
                border: active ? "2px solid #173f2d" : "1px solid #d3ddd6",
                borderRadius: 999,
                background: active ? "#173f2d" : "#fff",
                color: active ? "#fff" : "#304c3b",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: active ? "0 6px 16px rgba(23,63,45,.16)" : "none",
              }}
            >
              <span aria-hidden="true" style={{ marginRight: 7 }}>{item.emoji}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      <form onSubmit={search} style={{ display: "grid", gridTemplateColumns: "minmax(220px,2fr) repeat(3,minmax(150px,1fr))", gap: 10, padding: 14, border: "1px solid #dce5df", borderRadius: 18, background: "#f8fbf9" }}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search milk, chicken, mince, cheese…" style={{ minHeight: 46, border: "1px solid #cdd9d1", borderRadius: 12, padding: "0 13px", fontSize: 16 }} />
        <select value={location} onChange={(event) => setLocation(event.target.value)} style={{ minHeight: 46, border: "1px solid #cdd9d1", borderRadius: 12, padding: "0 10px" }}>
          <option value="Blenheim">Blenheim</option>
          <option value="Marlborough">Marlborough</option>
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)} style={{ minHeight: 46, border: "1px solid #cdd9d1", borderRadius: 12, padding: "0 10px" }}>
          <option value="all">All categories</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button type="submit" style={{ minHeight: 46, border: 0, borderRadius: 12, background: "#173f2d", color: "white", fontWeight: 800, cursor: "pointer" }}>Search prices</button>
      </form>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "16px 0 20px" }}>
        <select value={chain} onChange={(event) => setChain(event.target.value)} style={{ minHeight: 40, border: "1px solid #d3ddd6", borderRadius: 10, padding: "0 10px" }}>
          <option value="all">All supermarkets</option>
          {chains.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} style={{ minHeight: 40, border: "1px solid #d3ddd6", borderRadius: 10, padding: "0 10px" }}>
          <option value="price-asc">Cheapest price</option>
          <option value="unit-asc">Cheapest unit price</option>
          <option value="price-desc">Highest price</option>
          <option value="store">Supermarket</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 7, color: "#44564a", fontWeight: 700 }}>
          <input type="checkbox" checked={promoOnly} onChange={(event) => setPromoOnly(event.target.checked)} /> Specials only
        </label>
        <span style={{ marginLeft: "auto", color: "#68776e" }}>{listings.length} prices</span>
      </div>

      {loading && <div style={{ padding: 28, textAlign: "center", color: "#627067" }}>Loading supermarket prices…</div>}
      {error && <div style={{ padding: 18, borderRadius: 14, background: "#fff1ef", color: "#8a2922" }}>{error}</div>}
      {!loading && !error && listings.length === 0 && (
        <div style={{ padding: 28, borderRadius: 14, background: "#f5f8f6", color: "#5c6d62", textAlign: "center" }}>No matching prices found. Try another tab or search for a specific item such as mince, bacon, cheese or eggs.</div>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
        {listings.map((item) => <GroceryCard item={item} key={`${item.id}-${item.store}`} />)}
      </section>

      <footer style={{ marginTop: 26, color: "#748078", fontSize: 13 }}>
        Grocery data: Baskt latest observed supermarket snapshots. Prices can be regional, promotional, stale or unavailable; verify with the retailer before purchasing.
      </footer>
    </main>
  );
}
