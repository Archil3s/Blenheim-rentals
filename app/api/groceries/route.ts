import { getGroceryFeed } from "@/lib/groceries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const location = url.searchParams.get("location") ?? "Blenheim";

  try {
    const feed = await getGroceryFeed(query, location);
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
        query,
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
