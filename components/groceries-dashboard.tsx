"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GroceriesResponse, GroceryListing } from "@/lib/groceries/types";
import type { KetoGroup } from "@/lib/groceries/keto";
import { CARNIVORE_RECIPES, type CarnivoreRecipe } from "@/lib/groceries/carnivore-recipes";
import { carnivoreValue } from "@/lib/groceries/nutrition";

const money = new Intl.NumberFormat("en-NZ", {
  style: "currency",
  currency: "NZD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type SortOption =
  | "price-asc"
  | "price-desc"
  | "kg-asc"
  | "protein-desc"
  | "protein-value"
  | "carb-asc"
  | "store";
type ViewMode = "prices" | "meal-prep";

type QuickSearch = {
  id: string;
  label: string;
  emoji: string;
  query: string;
  group: KetoGroup;
};

const QUICK_SEARCHES: QuickSearch[] = [
  { id: "all", label: "All Carnivore", emoji: "🥩", query: "", group: "all" },
  { id: "beef", label: "Beef", emoji: "🥩", query: "beef", group: "meat" },
  { id: "chicken", label: "Chicken", emoji: "🍗", query: "chicken", group: "meat" },
  { id: "lamb", label: "Lamb", emoji: "🍖", query: "lamb", group: "meat" },
  { id: "pork", label: "Pork", emoji: "🥓", query: "pork", group: "meat" },
  { id: "bacon", label: "Bacon", emoji: "🥓", query: "bacon", group: "meat" },
  { id: "seafood", label: "Seafood", emoji: "🐟", query: "", group: "seafood" },
  { id: "eggs", label: "Eggs", emoji: "🥚", query: "", group: "eggs" },
  { id: "cheese", label: "Cheese", emoji: "🧀", query: "", group: "cheese" },
  { id: "dairy", label: "Butter & Cream", emoji: "🧈", query: "", group: "dairy" },
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
  const value = carnivoreValue(item);

  return (
    <article style={{ border: "1px solid #d9e2dc", borderRadius: 18, background: "white", padding: 18, boxShadow: "0 8px 24px rgba(20,61,42,.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#52705f", fontSize: 13, fontWeight: 700 }}>{item.category ?? "Carnivore food"}</div>
          <h2 style={{ margin: "5px 0 4px", fontSize: 20, color: "#173f2d" }}>{item.name}</h2>
          <div style={{ color: "#66756c", fontSize: 14 }}>
            {[item.brand, item.size].filter(Boolean).join(" · ") || item.chain}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <strong style={{ display: "block", color: "#173f2d", fontSize: 24 }}>{money.format(item.price)}</strong>
          {value.pricePerKg != null ? (
            <span style={{ color: "#65736b", fontSize: 13 }}>{money.format(value.pricePerKg)} / kg</span>
          ) : item.unitPrice != null ? (
            <span style={{ color: "#65736b", fontSize: 13 }}>
              {money.format(item.unitPrice)}{item.unitLabel ? ` / ${item.unitLabel}` : " / unit"}
            </span>
          ) : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8, marginTop: 14 }}>
        <div style={{ padding: "9px 10px", borderRadius: 12, background: "#f5f8f6" }}>
          <div style={{ fontSize: 11, color: "#718078", fontWeight: 800 }}>PRICE / KG</div>
          <strong style={{ color: "#214936" }}>{value.pricePerKg != null ? money.format(value.pricePerKg) : "—"}</strong>
        </div>
        <div style={{ padding: "9px 10px", borderRadius: 12, background: "#f5f8f6" }}>
          <div style={{ fontSize: 11, color: "#718078", fontWeight: 800 }}>PROTEIN</div>
          <strong style={{ color: "#214936" }}>{value.proteinPer100g != null ? `~${value.proteinPer100g}g / 100g` : "—"}</strong>
        </div>
        <div style={{ padding: "9px 10px", borderRadius: 12, background: "#f5f8f6" }}>
          <div style={{ fontSize: 11, color: "#718078", fontWeight: 800 }}>CARBS</div>
          <strong style={{ color: "#214936" }}>{value.carbsPer100g != null ? `~${value.carbsPer100g}g / 100g` : "—"}</strong>
        </div>
        <div style={{ padding: "9px 10px", borderRadius: 12, background: "#f5f8f6" }}>
          <div style={{ fontSize: 11, color: "#718078", fontWeight: 800 }}>100G PROTEIN</div>
          <strong style={{ color: "#214936" }}>{value.costPer100gProtein != null ? money.format(value.costPer100gProtein) : "—"}</strong>
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

function RecipeCard({ recipe, onShop }: { recipe: CarnivoreRecipe; onShop: (query: string) => void }) {
  return (
    <article style={{ border: "1px solid #ded7cc", borderRadius: 18, background: "#fffdfa", padding: 18, boxShadow: "0 8px 24px rgba(74,52,30,.06)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span aria-hidden="true" style={{ fontSize: 30 }}>{recipe.emoji}</span>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: "0 0 5px", color: "#4b3322", fontSize: 21 }}>{recipe.title}</h2>
          <div style={{ color: "#7a6859", fontSize: 13, fontWeight: 700 }}>
            {recipe.prepMinutes} min · {recipe.portions} portions · {recipe.freezerFriendly ? "Freezer friendly" : "Fridge prep"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 15 }}>
        <strong style={{ color: "#5a3c28" }}>Ingredients</strong>
        <ul style={{ margin: "7px 0 0", paddingLeft: 20, color: "#655447", lineHeight: 1.55 }}>
          {recipe.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}
        </ul>
      </div>

      <details style={{ marginTop: 14 }}>
        <summary style={{ cursor: "pointer", color: "#5a3c28", fontWeight: 800 }}>Prep method</summary>
        <ol style={{ margin: "8px 0 0", paddingLeft: 22, color: "#655447", lineHeight: 1.55 }}>
          {recipe.method.map((step) => <li key={step} style={{ marginBottom: 5 }}>{step}</li>)}
        </ol>
      </details>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 16, paddingTop: 14, borderTop: "1px solid #eee7de", flexWrap: "wrap" }}>
        <button type="button" onClick={() => onShop(recipe.shopQuery)} style={{ minHeight: 40, padding: "0 13px", border: 0, borderRadius: 10, background: "#4d3322", color: "white", fontWeight: 800, cursor: "pointer" }}>
          Find ingredients
        </button>
        <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#77583f", fontSize: 13, fontWeight: 700 }}>{recipe.sourceLabel} ↗</a>
      </div>
    </article>
  );
}

export function GroceriesDashboard() {
  const [view, setView] = useState<ViewMode>("prices");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [activeQuickSearch, setActiveQuickSearch] = useState("all");
  const [ketoGroup, setKetoGroup] = useState<KetoGroup>("all");
  const [location, setLocation] = useState("Blenheim");
  const [category, setCategory] = useState("all");
  const [chain, setChain] = useState("all");
  const [sort, setSort] = useState<SortOption>("protein-value");
  const [minProtein, setMinProtein] = useState(0);
  const [maxCarbs, setMaxCarbs] = useState(2);
  const [promoOnly, setPromoOnly] = useState(false);
  const [data, setData] = useState<GroceriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ location, ketoGroup });
    if (submittedQuery) params.set("q", submittedQuery);

    fetch(`/api/groceries?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as GroceriesResponse;
        if (!response.ok) throw new Error(payload.error ?? "Unable to load carnivore supermarket prices.");
        setData(payload);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Unable to load carnivore supermarket prices.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [submittedQuery, location, ketoGroup]);

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
      const value = carnivoreValue(item);
      if (minProtein > 0 && (value.proteinPer100g == null || value.proteinPer100g < minProtein)) return false;
      if (maxCarbs >= 0 && (value.carbsPer100g == null || value.carbsPer100g > maxCarbs)) return false;
      return true;
    });

    return [...result].sort((a, b) => {
      const av = carnivoreValue(a);
      const bv = carnivoreValue(b);
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "kg-asc") return (av.pricePerKg ?? Number.POSITIVE_INFINITY) - (bv.pricePerKg ?? Number.POSITIVE_INFINITY);
      if (sort === "protein-desc") return (bv.proteinPer100g ?? -1) - (av.proteinPer100g ?? -1);
      if (sort === "protein-value") return (av.costPer100gProtein ?? Number.POSITIVE_INFINITY) - (bv.costPer100gProtein ?? Number.POSITIVE_INFINITY);
      if (sort === "carb-asc") {
        const carbDifference = (av.carbsPer100g ?? Number.POSITIVE_INFINITY) - (bv.carbsPer100g ?? Number.POSITIVE_INFINITY);
        if (carbDifference !== 0) return carbDifference;
        return (av.costPer100gProtein ?? Number.POSITIVE_INFINITY) - (bv.costPer100gProtein ?? Number.POSITIVE_INFINITY);
      }
      if (sort === "store") return `${a.chain} ${a.store}`.localeCompare(`${b.chain} ${b.store}`);
      return a.price - b.price;
    });
  }, [data, category, chain, promoOnly, minProtein, maxCarbs, sort]);

  const uniqueItemCount = useMemo(() => {
    return new Set(listings.map((item) => [item.name, item.brand ?? "", item.size ?? ""].join("|"))).size;
  }, [listings]);

  function search(event: FormEvent) {
    event.preventDefault();
    const nextQuery = query.trim();
    setActiveQuickSearch("custom");
    setKetoGroup("all");
    setCategory("all");
    setSubmittedQuery(nextQuery);
    setView("prices");
  }

  function runQuickSearch(item: QuickSearch) {
    setActiveQuickSearch(item.id);
    setQuery(item.query);
    setSubmittedQuery(item.query);
    setKetoGroup(item.group);
    setCategory("all");
    setChain("all");
    setView("prices");
  }

  function shopRecipe(searchQuery: string) {
    setView("prices");
    setActiveQuickSearch("custom");
    setQuery(searchQuery);
    setSubmittedQuery(searchQuery);
    setKetoGroup("all");
    setCategory("all");
    setChain("all");
  }

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 18px 60px" }}>
      <header style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, color: "#4e6f5b", fontWeight: 800 }}>BLENHEIM CARNIVORE PRICE FINDER</p>
        <h1 style={{ margin: "5px 0 6px", color: "#143d2a", fontSize: "clamp(2rem,5vw,3.6rem)" }}>Carnivore Keto</h1>
        <p style={{ margin: 0, color: "#66756c", maxWidth: 780 }}>Only animal-based keto/carnivore human foods are shown. Compare price per kg, estimated protein, estimated carbs and protein value.</p>
      </header>

      <div style={{ display: "inline-flex", gap: 6, padding: 5, borderRadius: 14, background: "#edf3ef", marginBottom: 16 }}>
        <button type="button" onClick={() => setView("prices")} style={{ minHeight: 42, padding: "0 16px", border: 0, borderRadius: 10, background: view === "prices" ? "#173f2d" : "transparent", color: view === "prices" ? "#fff" : "#365243", fontWeight: 900, cursor: "pointer" }}>🥩 Prices</button>
        <button type="button" onClick={() => setView("meal-prep")} style={{ minHeight: 42, padding: "0 16px", border: 0, borderRadius: 10, background: view === "meal-prep" ? "#173f2d" : "transparent", color: view === "meal-prep" ? "#fff" : "#365243", fontWeight: 900, cursor: "pointer" }}>🍱 Meal Prep</button>
      </div>

      {view === "meal-prep" ? (
        <>
          <section style={{ padding: 16, border: "1px solid #e3d8ca", borderRadius: 16, background: "#fffaf4", marginBottom: 16 }}>
            <h2 style={{ margin: "0 0 6px", color: "#4b3322" }}>Carnivore meal-prep ideas</h2>
            <p style={{ margin: 0, color: "#735f4f", lineHeight: 1.5 }}>Simplified meal-prep recipes built around recurring carnivore/keto community patterns.</p>
          </section>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(310px,1fr))", gap: 14 }}>
            {CARNIVORE_RECIPES.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} onShop={shopRecipe} />)}
          </section>
        </>
      ) : (
        <>
          <nav aria-label="Carnivore food filters" style={{ display: "flex", gap: 9, overflowX: "auto", padding: "4px 2px 12px", marginBottom: 8, WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }}>
            {QUICK_SEARCHES.map((item) => {
              const active = activeQuickSearch === item.id;
              return (
                <button key={item.id} type="button" onClick={() => runQuickSearch(item)} aria-pressed={active} style={{ flex: "0 0 auto", minHeight: 46, padding: "0 15px", border: active ? "2px solid #173f2d" : "1px solid #d3ddd6", borderRadius: 999, background: active ? "#173f2d" : "#fff", color: active ? "#fff" : "#304c3b", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: active ? "0 6px 16px rgba(23,63,45,.16)" : "none" }}>
                  <span aria-hidden="true" style={{ marginRight: 7 }}>{item.emoji}</span>{item.label}
                </button>
              );
            })}
          </nav>

          <section style={{ margin: "2px 0 16px", padding: 14, borderRadius: 16, background: "#eef7ef", border: "1px solid #cfe1d1" }}>
            <strong style={{ color: "#204d32" }}>Low-carb carnivore value</strong>
            <small style={{ display: "block", marginTop: 5, color: "#5f7665" }}>Default filter is ≤2g estimated carbs per 100g. Protein and carbohydrate values are food-type estimates, not product nutrition-label values. Price/kg uses Baskt unit pricing where possible, otherwise pack weight.</small>
          </section>

          <form onSubmit={search} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, padding: 14, border: "1px solid #dce5df", borderRadius: 18, background: "#f8fbf9" }}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search steak, mince, bacon, salmon…" style={{ minHeight: 46, border: "1px solid #cdd9d1", borderRadius: 12, padding: "0 13px", fontSize: 16, gridColumn: "span 2" }} />
            <select value={location} onChange={(event) => setLocation(event.target.value)} style={{ minHeight: 46, border: "1px solid #cdd9d1", borderRadius: 12, padding: "0 10px" }}>
              <option value="Blenheim">Blenheim</option>
              <option value="Marlborough">Marlborough</option>
            </select>
            <select value={category} onChange={(event) => setCategory(event.target.value)} style={{ minHeight: 46, border: "1px solid #cdd9d1", borderRadius: 12, padding: "0 10px" }}>
              <option value="all">All source categories</option>
              {categories.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <button type="submit" style={{ minHeight: 46, border: 0, borderRadius: 12, background: "#173f2d", color: "white", fontWeight: 800, cursor: "pointer" }}>Search carnivore foods</button>
          </form>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "16px 0 20px" }}>
            <select value={chain} onChange={(event) => setChain(event.target.value)} style={{ minHeight: 40, border: "1px solid #d3ddd6", borderRadius: 10, padding: "0 10px" }}>
              <option value="all">All supermarkets</option>
              {chains.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} style={{ minHeight: 40, border: "1px solid #d3ddd6", borderRadius: 10, padding: "0 10px" }}>
              <option value="protein-value">Best protein value</option>
              <option value="carb-asc">Lowest carbs / 100g</option>
              <option value="kg-asc">Cheapest per kg</option>
              <option value="protein-desc">Highest protein / 100g</option>
              <option value="price-asc">Cheapest sticker price</option>
              <option value="price-desc">Highest sticker price</option>
              <option value="store">Supermarket</option>
            </select>
            <select value={minProtein} onChange={(event) => setMinProtein(Number(event.target.value))} style={{ minHeight: 40, border: "1px solid #d3ddd6", borderRadius: 10, padding: "0 10px" }}>
              <option value={0}>Any protein level</option>
              <option value={15}>15g+ protein / 100g</option>
              <option value={20}>20g+ protein / 100g</option>
              <option value={25}>25g+ protein / 100g</option>
              <option value={30}>30g+ protein / 100g</option>
            </select>
            <select value={maxCarbs} onChange={(event) => setMaxCarbs(Number(event.target.value))} style={{ minHeight: 40, border: "1px solid #d3ddd6", borderRadius: 10, padding: "0 10px" }}>
              <option value={0}>0g carbs / 100g</option>
              <option value={1}>≤1g carbs / 100g</option>
              <option value={2}>≤2g carbs / 100g</option>
              <option value={5}>≤5g carbs / 100g</option>
              <option value={-1}>Any estimated carbs</option>
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 7, color: "#44564a", fontWeight: 700 }}>
              <input type="checkbox" checked={promoOnly} onChange={(event) => setPromoOnly(event.target.checked)} /> Specials only
            </label>
            <span style={{ marginLeft: "auto", color: "#68776e", fontWeight: 700 }}>{uniqueItemCount} carnivore items · {listings.length} store prices</span>
          </div>

          {loading && <div style={{ padding: 28, textAlign: "center", color: "#627067" }}>Finding low-carb carnivore foods and prices…</div>}
          {error && <div style={{ padding: 18, borderRadius: 14, background: "#fff1ef", color: "#8a2922" }}>{error}</div>}
          {!loading && !error && listings.length === 0 && (
            <div style={{ padding: 28, borderRadius: 14, background: "#f5f8f6", color: "#5c6d62", textAlign: "center" }}>No matches at this carb/protein level. Try raising the carb limit, lowering the protein minimum, or choosing another carnivore category.</div>
          )}

          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
            {listings.map((item) => <GroceryCard item={item} key={`${item.id}-${item.store}`} />)}
          </section>
        </>
      )}

      <footer style={{ marginTop: 26, color: "#748078", fontSize: 13 }}>
        Grocery data: Baskt latest observed supermarket snapshots. Protein and carbohydrate values are approximate food-type estimates, not retailer nutrition panels. Verify processed products and exact nutrition on the pack before purchasing.
      </footer>
    </main>
  );
}
