import { NextResponse } from "next/server";
import { fetchLiveJobs } from "@/lib/jobs/live-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const jobs = await fetchLiveJobs();
    return NextResponse.json(
      { jobs, count: jobs.length, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load live jobs." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
