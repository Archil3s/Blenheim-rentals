# Blenheim Rentals

A lightweight, stateless Blenheim rental aggregator built with Next.js.

The app is deliberately designed **without a database**. When the browser requests `/api/rentals`, the server asks the enabled source adapters for their current listings, normalises and deduplicates them, returns JSON, and keeps only a short in-process RAM cache.

## Current status

The application shell is complete and includes:

- responsive Blenheim rentals dashboard
- `/api/rentals` Route Handler
- source adapter architecture
- concurrent source fetching
- per-source failure isolation
- address-based deduplication
- 3-minute in-memory cache
- 30-second guard against repeated forced refreshes
- search, maximum-rent and minimum-bedroom filters
- source health/status display
- demo adapter so the project works before live sources are connected

The Trade Me, realestate.co.nz, myRent, Summit and local-agency adapters are currently placeholders. They are intentionally not scraping those sites yet.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

The demo feed is on by default. Copy `.env.example` to `.env.local` if you want to change cache settings.

```bash
cp .env.example .env.local
```

## Data flow

```text
Browser
  ↓
GET /api/rentals
  ↓
short RAM cache
  ↓ cache miss
source adapters (concurrently)
  ↓
normalise
  ↓
deduplicate
  ↓
JSON response
  ↓
render cards + filters
```

No rental listings are written to SQLite, Postgres, local files, browser storage, or another persistent database.

## RAM cache behaviour

Defaults:

```env
CACHE_TTL_MS=180000
MIN_FORCE_REFRESH_AGE_MS=30000
```

A normal request may reuse a feed for up to 3 minutes. The Refresh listings button requests a forced refresh, but the server will still reuse a feed less than 30 seconds old so repeated clicking does not hammer upstream sources.

This cache is intentionally ephemeral. On serverless hosting, each running function instance can have its own memory and that memory can disappear whenever the platform recycles the instance.

## Adding a live source

Each source implements `RentalSourceAdapter`:

```ts
export type RentalSourceAdapter = {
  name: string;
  enabled: boolean;
  fetchRentals: () => Promise<Rental[]>;
};
```

Return the common `Rental` shape from the adapter and add it to `lib/rentals/sources/index.ts`.

Keep source-specific parsing, API credentials, selectors and error handling inside that adapter. The rest of the application should not know how the provider works.

Prefer an official API, feed, partnership endpoint or other source-approved access method where one exists. Do not build around bypassing authentication, bot controls or access restrictions. Check each provider's current terms and robots/access rules before enabling automated retrieval.

## Demo mode

Demo listings are intentionally obvious sample data. To disable them:

```env
RENTALS_DEMO_MODE=false
```

Do this when at least one real adapter is ready so an empty source configuration is not mistaken for a broken UI.

## Deploy

The project is suitable for Vercel or another Node-compatible Next.js host.

For Vercel:

1. Import this GitHub repository into Vercel.
2. Keep the framework preset as Next.js.
3. Add any environment variables required by future source adapters.
4. Deploy.

No database service is required.

## Suggested next implementation order

1. Identify the cleanest permitted live source for Blenheim rentals.
2. Implement that one adapter end-to-end.
3. Validate normalisation and duplicate handling against real listings.
4. Add additional providers one at a time.
5. Turn off demo mode.
