"use client";

import { useMemo, useState } from "react";
import { ROOMIES_AREAS, roomiesAreaForSlug } from "@/lib/rentals/roomies";

type View = "rooms" | "all";
const FEATURED = new Set(["marlborough", "tauranga", "mount-maunganui", "arataki", "papamoa-beach", "otumoetai"]);

export function FlattingDashboard() {
  const [view, setView] = useState<View>("rooms");
  const [query, setQuery] = useState("");
  const areas = useMemo(() => ROOMIES_AREAS
    .filter(a => (a.name + " " + a.searchArea).toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(FEATURED.has(b.slug)) - Number(FEATURED.has(a.slug))), [query]);

  return (
    <section className="flatting-shell" aria-label="Flatting and Roomies searches">
      <header className="flatting-hero">
        <span className="flatting-kicker">ROOMS & FLATMATES</span>
        <h1>Find a room, not a whole house.</h1>
        <p>Browse rooms, shared homes and potential flatmates. Choose a location to see the current searches on Roomies.co.nz.</p>
        <a href="https://www.roomies.co.nz/" target="_blank" rel="noopener noreferrer">Explore Roomies <span aria-hidden="true">↗</span></a>
      </header>

      <div className="flatting-controls">
        <div className="flatting-modes" role="group" aria-label="Roomies search type">
          <button type="button" onClick={() => setView("rooms")} aria-pressed={view === "rooms"} className={view === "rooms" ? "active" : ""}>Rooms available</button>
          <button type="button" onClick={() => setView("all")} aria-pressed={view === "all"} className={view === "all" ? "active" : ""}>Rooms + people</button>
        </div>
        <label className="flatting-search">Area
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Tauranga, Blenheim..." />
        </label>
      </div>

      <div className="flatting-grid">
        {areas.map(area => {
          const exactRoomsLink = view === "rooms" && Boolean(area.roomsUrl);
          return (
            <article key={area.slug} className="flatting-card">
              <span className="flatting-source">ROOMIES.CO.NZ</span>
              <h2>{area.name}</h2>
              <p>{area.nearby
                ? "Nearby " + area.searchArea + " search — not verified as exact Arataki listings."
                : area.searchArea !== area.name
                  ? "Search area: " + area.searchArea
                  : "Find shared living options in this area."}</p>
              <a href={view === "rooms" ? area.roomsUrl ?? area.allUrl : area.allUrl}
                target="_blank" rel="noopener noreferrer">
                {exactRoomsLink ? "See available rooms" : "Browse on Roomies"} <span aria-hidden="true">↗</span>
              </a>
              {view === "rooms" && !area.roomsUrl && <small>Select “Rooms only” on Roomies to filter results.</small>}
            </article>
          );
        })}
      </div>
      {areas.length === 0 && <p>No matching location here. <a href="https://www.roomies.co.nz/" target="_blank" rel="noopener noreferrer">Search all of NZ on Roomies</a>.</p>}
      <p className="flatting-fineprint">Roomies is an independent service. Room listings, prices and flatmate profiles are shown on Roomies rather than imported into this website. Roomies searches are not included in house counts, new-listing alerts or housing diary downloads. Use Roomies to set your budget and contact advertisers.</p>
    </section>
  );
}

export function RoomiesRegionBanner({ regionSlug }: { regionSlug: string }) {
  const area = roomiesAreaForSlug(regionSlug);
  if (!area) return null;
  return (
    <aside className="flatting-region-banner" aria-label={"Flatting in " + area.name}>
      <div className="flatting-region-content">
        <span className="flatting-kicker">NEED A ROOM INSTEAD?</span>
        <h2>Flatting & rooms in {area.name}</h2>
        <p>{area.nearby
          ? "Roomies search covers nearby Mount Maunganui, not necessarily Arataki itself."
          : "Find a room or a flatmate on Roomies, separate from whole-house rentals."}</p>
      </div>
      <a href={area.roomsUrl ?? area.allUrl} target="_blank" rel="noopener noreferrer">Find rooms on Roomies <span aria-hidden="true">↗</span></a>
    </aside>
  );
}
