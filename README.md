# Blenheim Rentals

A lightweight, stateless Blenheim rental viewer built with Next.js.

The app is deliberately designed **without a database** and **without Playwright/browser automation**. A phone or desktop browser requests `/api/rentals`; the hosted Next.js server fetches enabled rental sources using ordinary HTTP, normalises and deduplicates the current results, returns JSON, and keeps only a short in-process RAM cache.

## Current status

The application includes:

- responsive Blenheim rentals dashboard
- `/api/rentals` Route Handler
- live OneRoof HTTP adapter
- Blenheim-area filtering
- source adapter architecture
- concurrent source fetching
- per-source failure isolation
- address-based deduplication
- 3-minute in-memory cache
- 30-second guard against repeated forced refreshes
- search, maximum-rent and minimum-bedroom filters
- source health/status display
- optional demo adapter for development

The Trade Me, realestate.co.nz, myRent, Summit and local-agency adapters remain placeholders.

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
deduplicate
  ↓
JSON response
  ↓
render cards + filters
```

The phone does not run a scraper, Chromium, Playwright, Node.js or a local helper service. It only loads the website and calls its API.

No rental listings are written to SQLite, Postgres, local files, browser storage, or another persistent database.

## OneRoof source

`lib/rentals/sources/oneroof.ts` currently requests the public Marlborough rental result pages with server-side `fetch()`, extracts property links and visible listing text, and returns Blenheim-area rentals in the common `Rental` format.

The adapter is enabled by default. Disable it with:

```env
ONEROOF_ENABLED=false
```

Automated retrieval can be affected by a provider changing its HTML, access controls, robots policy or terms. The adapter therefore remains isolated so it can be changed or disabled without affecting the rest of the application.

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

Demo listings are now disabled by default. To explicitly enable them for UI development:

```env
RENTALS_DEMO_MODE=true
```

## Deploy

The project is suitable for Vercel or another Node-compatible Next.js host.

For Vercel:

1. Import `Archil3s/Blenheim-rentals` into Vercel.
2. Keep the framework preset as Next.js.
3. Deploy with the default environment settings initially.
4. Open `/api/rentals` on the deployed site and confirm the OneRoof source reports `ok: true` and returns listings.
5. Then test the dashboard from your phone.

No database service is required.
