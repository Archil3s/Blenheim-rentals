import { getGroceryFeed } from "@/lib/groceries";
import type { KetoGroup } from "@/lib/groceries/keto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KETO_GROUPS = new Set<KetoGroup>([
  "all",
  "meat",
  "seafood",
  "eggs",
  "cheese",
  "dairy",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const location = url.searchParams.get("location") ?? "Blenheim";
  const mode = url.searchParams.get("mode") === "keto" ? "keto" : "standard";
  const requestedKetoGroup = url.searchParams.get("ketoGroup") as KetoGroup | null;
  const ketoGroup = requestedKetoGroup && KETO_GROUPS.has(requestedKetoGroup) ? requestedKetoGroup : "all";

  try {
    const feed = await getGroceryFeed(query, location, { mode, ketoGroup });
    return Response.json(feed, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Grocery feed failed", error);
    return Response.json(
      {
        listings: [],
        checkedAt: new Date().toISOString(),
        source: "Baskt",
        query: mode === "keto" ? `keto:${ketoGroup}` : query,
        location,
        error: "Unable to refresh supermarket prices right now.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  }
}
