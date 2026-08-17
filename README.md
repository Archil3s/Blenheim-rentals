# Blenheim Rentals

A lightweight, stateless Blenheim rental viewer built with Next.js.

The app is deliberately designed **without a database** and **without Playwright/browser automation**. A phone or desktop browser requests `/api/rentals`; the hosted Next.js server fetches enabled rental sources using ordinary HTTP, normalises and deduplicates the current results, returns JSON, and keeps only a short in-process RAM cache.

## Current status

The application includes:

- responsive Blenheim rentals dashboard
- `/api/rentals` Route Handler
- live OneRoof HTTP adapter
- live Ray White Blenheim HTTP adapter
- Blenheim-area filtering
- source adapter architecture
- concurrent source fetching
- per-source failure isolation
- address-based cross-source deduplication
- 3-minute in-memory cache
- 30-second guard against repeated forced refreshes
- search, maximum-rent and minimum-bedroom filters
- source health/status display
- optional demo adapter for development

The Trade Me, realestate.co.nz, myRent, Summit and generic local-agency adapters remain placeholders. Some providers prohibit automated HTML scraping in their terms, so those sources should only be enabled through an approved API/feed or with provider permission.

## Phone-friendly data flow

```text
iPhone / Android / desktop browser
  ↓
GET /api/rentals
  ↓
hosted Next.js server
  ↓
short RAM cache
  ↓ cache miss
plain HTTP source adapters
  ↓
normalise
  ↓
deduplicate by address
  ↓
JSON response
  ↓
render cards + filters
```

The phone does not run a scraper, Chromium, Playwright, Node.js or a local helper service. It only loads the website and calls its API.

No rental listings are written to SQLite, Postgres, local files, browser storage, or another persistent database.

## Live sources

### OneRoof

`lib/rentals/sources/oneroof.ts` requests the Marlborough rental result pages with server-side `fetch()`, extracts property links and visible listing text, and returns Blenheim-area rentals in the common `Rental` format.

Disable it with:

```env
ONEROOF_ENABLED=false
```

### Ray White Blenheim

`lib/rentals/sources/raywhite.ts` requests Ray White Blenheim's residential-for-rent page with ordinary server-side `fetch()`. It extracts the current residential listing URL, weekly rent, address, bedrooms and bathrooms, then returns the same common `Rental` format.

Disable it with:

```env
RAYWHITE_ENABLED=false
```

Because both sources can advertise the same home, the feed deduplicates by normalised address before it reaches the dashboard.

Automated retrieval can be affected by a provider changing its HTML, access controls, robots policy or terms. Each adapter therefore remains isolated so it can be changed or disabled without affecting the rest of the application.

## Sources requiring a different access method

- `realestate.co.nz` publishes an official signed Listings API. It requires an issued API key and secret; use that rather than scraping its website.
- `myRent` currently prohibits automated screen/database scraping in its website terms.
- `Summit` currently requires express approval to use/link its site material.
- Trade Me should only be connected through an access method permitted by its current developer/data terms.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Copy `.env.example` to `.env.local` to change source/cache settings:

```bash
cp .env.example .env.local
```

## RAM cache behaviour

Defaults:

```env
CACHE_TTL_MS=180000
MIN_FORCE_REFRESH_AGE_MS=30000
```

A normal request may reuse a feed for up to 3 minutes. The Refresh listings button requests a forced refresh, but the server will still reuse a feed less than 30 seconds old so repeated clicking does not hammer upstream sources.

This cache is intentionally ephemeral. On serverless hosting, each running function instance can have its own memory and that memory can disappear whenever the platform recycles the instance.

## Adding another live source

Each source implements `RentalSourceAdapter`:

```ts
export type RentalSourceAdapter = {
  name: string;
  enabled: boolean;
  fetchRentals: () => Promise<Rental[]>;
};
```

Return the common `Rental` shape from the adapter and add it to `lib/rentals/sources/index.ts`.

Keep source-specific parsing, credentials, selectors and error handling inside that adapter. Prefer an official API/feed or other permitted public-page retrieval where available. Do not build around bypassing authentication or access controls.

## Demo mode

Demo listings are disabled by default. To explicitly enable them for UI development:

```env
RENTALS_DEMO_MODE=true
```

## Deploy

The project is suitable for Netlify, Vercel or another Node-compatible Next.js host.

For Netlify:

1. Import `Archil3s/Blenheim-rentals` from GitHub.
2. Let Netlify detect Next.js.
3. Add the environment variables from `.env.example` if you want to override their defaults.
4. Deploy.
5. Open `/api/rentals` on the deployed site and confirm the live source statuses report `ok: true`.
6. Test the dashboard and Refresh listings button from your phone.

No database service is required.
