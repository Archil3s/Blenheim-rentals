# Blenheim Rentals — Project Context

_Last updated: 20 August 2026_

This file is the handoff/reference document for future ChatGPT/Codex sessions working on this repository.

**Repository:** `Archil3s/Blenheim-rentals`

**Live site:** `https://blenheim-rentals.daniel-dutoit.workers.dev/`

**Production branch:** `main`

**Important:** when this file and the code disagree, inspect the current code before changing anything. The existing `README.md` is older than the current Cloudflare build and contains stale deployment/source notes.

---

## 1. Product goal

Rental Finder is a lightweight NZ regional rental aggregator with a strong Marlborough/Blenheim focus.

The public product should stay simple:

1. Open the site.
2. Search/filter rentals.
3. Browse house photos.
4. Save/share useful listings.
5. Open the original listing.
6. Optionally export the currently filtered rentals into the CMM Housing Search Diary Word document.

Avoid turning the public page into a technical dashboard. Provider diagnostics, scraper implementation details, and source directories should not be displayed to ordinary users.

---

## 2. Current stack

- Next.js `16.2.11`
- React `19.2.x`
- TypeScript `5.9.x`
- OpenNext Cloudflare `1.20.2`
- Wrangler `4.124.0`
- `docx` `9.7.1` for Housing Search Diary generation
- Cloudflare Workers hosting
- No database
- Temporary in-process RAM cache only

The app is deliberately stateless. Rental listings are fetched on demand, normalised, deduplicated, returned to the browser, and then forgotten when process memory disappears.

---

## 3. Cloudflare deployment — do not break this

### Known-good production configuration

Cloudflare production should use:

```text
Build command:
npx @opennextjs/cloudflare build

Deploy command:
npx @opennextjs/cloudflare deploy

Production branch:
main
```

The project package script must remain:

```json
"build": "next build"
```

Do **not** change `npm run build` to run OpenNext itself when Cloudflare already runs `npx @opennextjs/cloudflare build`. Doing that previously caused OpenNext to run twice and generated duplicate exports in `.open-next/cloudflare/next-env.mjs`.

### Wrangler configuration

`wrangler.jsonc` currently points to:

```text
main: .open-next/worker.js
assets: .open-next/assets
compatibility_flags: nodejs_compat
```

`next.config.ts` must keep:

```ts
output: "standalone"
```

That is required for the OpenNext packaging path used here.

### Preview / branch deployment caveat

A branch build will fail at `npx @opennextjs/cloudflare upload` if Cloudflare only ran `npm run build`, because a normal Next.js build does not create `.open-next`.

Typical failure:

```text
ERROR Could not find compiled Open Next config, did you run the build command?
```

If branch previews are enabled, either make the preview build command run:

```text
npx @opennextjs/cloudflare build
```

before upload, or use:

```text
npx @opennextjs/cloudflare build --skipNextBuild && npx @opennextjs/cloudflare upload
```

after a successful `next build`.

Do not change the working production configuration just to solve a preview-only problem.

---

## 4. Main application structure

Important files:

```text
app/page.tsx
components/rentals-dashboard.tsx
components/housing-diary-export.tsx
app/api/rentals/route.ts
app/api/rental-details/route.ts
app/api/rental-image/route.ts
app/api/housing-diary/route.ts
lib/rentals/
lib/rentals/sources/
lib/rentals/housing-diary.ts
lib/rentals/source-directory.ts
lib/rentals/regions.ts
app/manifest.ts
app/sitemap.ts
app/robots.ts
wrangler.jsonc
open-next.config.ts
next.config.ts
```

### API responsibilities

- `/api/rentals` — build/return the current normalised rental feed.
- `/api/rental-details` — detail-page enrichment where needed.
- `/api/rental-image` — image proxy used to avoid direct hot-link failures from provider/CDN image hosts.
- `/api/housing-diary` — generate the `.docx` Housing Search Diary.

---

## 5. Current public UI behaviour

The public page currently includes:

- compact Rental Finder hero
- current rental count and refresh control
- search by suburb/address/property manager
- region/suburb filter
- maximum weekly rent filter
- minimum-bedroom filter
- sorting by rent / bedrooms / recently checked
- shareable URL-backed filters
- save search locally
- save individual listings locally
- share individual listings
- map link
- original listing link
- regional SEO pages such as `/rentals/marlborough`
- sitemap and robots routes
- PWA manifest/installation support
- source/freshness information on each individual rental card
- photo galleries for listings where images are available

### Public sections intentionally removed

Do **not** re-add these large technical sections to the public page unless explicitly requested:

- `Listing coverage`
- `More rental sources`
- full provider status/debug lists

They were removed because they clutter the renter experience.

---

## 6. Rental photos

Rental records can expose:

```text
imageUrl
imageUrls[]
```

Current image strategy:

1. Source adapters extract usable property photos from public listing/search/detail pages.
2. Obvious logos/icons should be excluded.
3. Images are served through `/api/rental-image` instead of relying on direct hot-linking.
4. Cards support multiple photos.
5. The gallery is horizontally swipeable/drag-scrollable with scroll snapping.
6. The `1/3`, `2/3`, etc. photo count remains visible.

If photos appear as broken image placeholders while a count such as `1/3` is present, the listing contains image URLs but the proxy/source response needs investigation.

Do not solve this by disabling the gallery.

---

## 7. Housing Search Diary — desired behaviour

The user wants this **very simple**.

Desired workflow:

```text
set normal rental filters
→ current matching rentals are visible
→ click Export housing diary
→ download Housing Search Diary.docx
```

Do not add unless explicitly requested:

- client-name workflow
- per-property diary checkboxes
- editable result/follow-up fields
- a case-management system
- extra manual diary steps

The export should use the rental records already loaded in the browser and should not re-scrape up to dozens of external detail pages while generating the Word file.

`app/api/housing-diary/route.ts` was simplified for this reason.

### Current implementation caveat

`components/housing-diary-export.tsx` now exists and implements the desired simple one-button export.

However, at the time this handoff file was created, `components/rentals-dashboard.tsx` still contains the older price-band diary UI/state. A future cleanup should wire `HousingDiaryExport` into the dashboard and remove the obsolete price-band selection UI/state. Do not add more diary complexity while doing this.

---

## 8. Rental source architecture

Adapters are registered in:

```text
lib/rentals/sources/index.ts
```

The feed isolates each adapter so a single provider failure should not break the entire rental search.

Listings are normalised into the common `Rental` type and deduplicated across sources.

A provider returning `0` listings does **not automatically mean the adapter is broken**. It may simply have no current matching stock or its HTML may have changed. Inspect the source response before deciding.

---

## 9. Current source status / rules

### Enabled by default in `.env.example`

```env
ONEROOF_ENABLED=true
RAYWHITE_ENABLED=true
RAYWHITE_COMPLETE_ENABLED=true
BNPROPERTIES_ENABLED=true
QUINOVIC_ENABLED=true
BAYLEYS_ENABLED=true
```

Current implemented live/public-page adapters:

- OneRoof
- Ray White Blenheim
- Ray White Complete PM
- B&N Properties
- Quinovic Blenheim
- Bayleys Marlborough

### Disabled / special handling

```env
SUMMIT_ENABLED=false
RENTALS_DEMO_MODE=false
```

Source guidance currently recorded in the repo:

- **Summit Property Management** — adapter exists but stays opt-in pending provider approval.
- **realestate.co.nz** — use its official Listings API rather than scraping.
- **Harcourts Blenheim** — public provider site, but automatic discovery has not been reliable enough to enable.
- **Property Brokers Blenheim** — provider terms restrict content reuse without authorisation.
- **myRent** — current terms prohibit screen/database scraping; keep as a direct/manual cross-check unless permission changes.
- **Trade Me Property** — current developer/data rules restrict combining Trade Me listings with other-site listings.
- **homes.co.nz** — public detail pages exist, but reliable location-based automatic discovery is not enabled.

Non-commercial/fun-project intent does not automatically override provider access rules. Prefer official APIs/feeds or permitted public retrieval. Do not build around bypassing authentication, CAPTCHAs, paywalls, or access controls.

---

## 10. Cache model

The rental feed uses a short in-process RAM cache.

Defaults:

```env
CACHE_TTL_MS=180000
MIN_FORCE_REFRESH_AGE_MS=30000
```

Meaning:

- normal requests can reuse a feed for about 3 minutes
- forced refreshes are guarded so repeated clicking within ~30 seconds does not hammer providers
- cache contents are ephemeral and may disappear whenever a Cloudflare Worker isolate/process is recycled

No database should be added just to preserve ordinary rental-feed results unless the product requirements explicitly change.

---

## 11. Recent important fixes

These are useful historical guardrails:

- Cloudflare deployment converted from the old Netlify-oriented setup to OpenNext + Workers.
- `next.config.ts` gained `output: "standalone"` for OpenNext packaging.
- `package.json` `build` was restored to `next build` to prevent recursive/double OpenNext builds.
- PWA manifest icon purpose was split into valid single values instead of `"any maskable"`.
- property photos were added to multiple source adapters.
- `/api/rental-image` was added to proxy property images that failed when hot-linked directly.
- Bayleys Marlborough public-page parsing was added.
- Housing diary generation was changed to use supplied rental data rather than doing expensive contact re-fetches during export.
- provider/source diagnostic sections were removed from the public renter-facing page.
- photo galleries were changed to swipe/drag scroll-snap galleries.

---

## 12. Known technical caveats

- Provider HTML can change without notice; parser breakage should be isolated to that adapter.
- Some providers may intentionally block server requests or image requests.
- Cloudflare Worker in-memory cache is not durable storage.
- `docx` generation depends on Node compatibility in the Worker runtime; `nodejs_compat` is intentionally enabled.
- The old `README.md` still describes parts of the earlier Netlify/source state. Treat this file and current code as more current.
- Branch-preview Cloudflare settings have previously differed from production settings.
- Do not interpret a failed preview upload as a failed production Worker unless the production `main` deployment also failed.

---

## 13. Development principles for future changes

When changing this repo:

1. Inspect the current implementation first.
2. Prefer small isolated changes.
3. Do not change working Cloudflare deployment configuration unless the deployment problem requires it.
4. Keep source-specific parsing inside its adapter.
5. Keep provider failures isolated.
6. Keep the renter UI simple and low-friction.
7. Avoid exposing provider/debug implementation details to public users.
8. Preserve mobile usability.
9. Preserve direct links to original listings.
10. Preserve photo proxying and gallery support.
11. Keep the Housing Diary export simple.
12. Use a feature branch + PR for substantive changes when practical; merge to `main` after checking the diff.
13. After changes to architecture, deployment, sources, or major UX behaviour, update this file.

---

## 14. Useful test checklist after a deployment

After Cloudflare reports a successful production deployment, check:

```text
Homepage loads
/api/rentals returns JSON
Rental counts appear
Search/filter controls work
Regional pages load
At least one photo-backed listing renders through the image proxy
Photo gallery can be swiped/dragged
Original listing links open
Saved/share controls work
Housing diary export downloads a .docx
robots.txt loads
sitemap.xml loads
```

Use a hard refresh (`Ctrl + F5`) or private window when checking UI changes after deployment.

---

## 15. New-chat bootstrap prompt

In a new ChatGPT/Codex chat, use something like:

```text
Work on my GitHub repo Archil3s/Blenheim-rentals.
First read PROJECT_CONTEXT.md in the repo and inspect the current code before making changes.
Treat PROJECT_CONTEXT.md as the project handoff, but if it conflicts with current code, verify the code and update the context file as part of the change.
Keep the existing Cloudflare/OpenNext deployment working and keep the renter-facing UI simple.
```

For a specific task, add the request after that paragraph.

Example:

```text
Work on my GitHub repo Archil3s/Blenheim-rentals.
First read PROJECT_CONTEXT.md and inspect the current code.
Then add previous/next arrow buttons to the existing swipeable listing photo galleries without changing the rental source logic or Cloudflare deployment settings.
```

---

## 16. Source-of-truth rule

For future sessions, use this order:

```text
1. Current repository code
2. PROJECT_CONTEXT.md
3. Current Cloudflare build/deploy logs supplied by the user
4. README.md
5. Assumptions
```

Never rely on an old chat summary when the repository can be inspected directly.
