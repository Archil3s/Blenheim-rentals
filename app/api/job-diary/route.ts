import { generateJobSearchDiary } from "@/lib/jobs/job-diary";
import type { SavedJob } from "@/lib/jobs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_JOBS = 250;

function isJob(value: unknown): value is SavedJob {
  if (!value || typeof value !== "object") return false;
  const job = value as Partial<SavedJob>;
  return (
    typeof job.id === "string" &&
    job.id.length > 0 &&
    typeof job.title === "string" &&
    job.title.length > 0 &&
    typeof job.source === "string" &&
    typeof job.url === "string" &&
    typeof job.savedAt === "string"
  );
}

function exportDate() {
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: "Pacific/Auckland",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date())
    .replaceAll("/", "-");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { jobs?: unknown[] };
    const jobs = Array.isArray(body.jobs) ? body.jobs.filter(isJob).slice(0, MAX_JOBS) : [];

    if (jobs.length === 0) {
      return Response.json({ error: "Save at least one job before exporting the diary." }, { status: 400 });
    }

    const diary = await generateJobSearchDiary(jobs);
    const filename = `Job Search Diary - ${exportDate()}.docx`;

    return new Response(diary, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Job-Diary-Count": String(jobs.length),
      },
    });
  } catch (error) {
    console.error("Job diary export failed", error);
    return Response.json({ error: "Could not create the job diary. Please try again." }, { status: 500 });
  }
}
