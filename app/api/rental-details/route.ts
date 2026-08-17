import { getRentalFeed } from "@/lib/rentals";
import { getCachedFeed, setCachedFeed } from "@/lib/rentals/cache";
import { enrichRentalContacts } from "@/lib/rentals/contact-enrichment";
import type { Rental } from "@/lib/rentals/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DETAIL_TTL_MS = 10 * 60 * 1000;
const detailCache = new Map<string, { rental: Rental; createdAt: number }>();

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ error: "Rental id is required" }, { status: 400 });
  }

  const cached = detailCache.get(id);
  if (cached && Date.now() - cached.createdAt < DETAIL_TTL_MS) {
    return Response.json(cached.rental, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  }

  let feed = getCachedFeed(false)?.value;
  if (!feed) {
    feed = await getRentalFeed();
    setCachedFeed(feed);
  }

  const rental = feed.rentals.find((item) => item.id === id);
  if (!rental) {
    return Response.json({ error: "Rental is no longer in the current feed" }, { status: 404 });
  }

  const [enriched] = await enrichRentalContacts([rental]);
  const result = enriched ?? rental;
  detailCache.set(id, { rental: result, createdAt: Date.now() });

  return Response.json(result, {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
