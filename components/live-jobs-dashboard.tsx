"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LiveJob } from "@/lib/jobs/live-jobs";

type JobsResponse = {
  jobs?: LiveJob[];
  count?: number;
  fetchedAt?: string;
  error?: string;
};

export function LiveJobsDashboard() {
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/jobs", { cache: "no-store" });
      const body = (await response.json()) as JobsResponse;
      if (!response.ok) throw new Error(body.error || "Could not load live jobs.");
      setJobs(Array.isArray(body.jobs) ? body.jobs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load live jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return jobs;
    return jobs.filter((job) =>
      [job.title, job.employer, job.location, job.source].some((value) => value.toLowerCase().includes(needle)),
    );
  }, [jobs, query]);

  const panel = {
    border: "1px solid #dce5df",
    borderRadius: 20,
    background: "white",
    boxShadow: "0 12px 30px rgba(23,63,45,.06)",
  } as const;

  return (
    <section style={{ maxWidth: 1120, margin: "28px auto 0", padding: "0 16px" }}>
      <div style={{ ...panel, overflow: "hidden" }}>
        <div style={{ padding: 20, borderBottom: "1px solid #e4ebe7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <div style={{ color: "#557063", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
                Automatically refreshed
              </div>
              <h2 style={{ margin: "5px 0 4px", color: "#173f2d" }}>Live Marlborough jobs</h2>
              <p style={{ margin: 0, color: "#67776e", fontSize: 14 }}>
                Current listings pulled from permitted public job sources, similar to the Rentals tab.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadJobs()}
              disabled={loading}
              style={{ border: 0, borderRadius: 12, padding: "10px 14px", background: "#173f2d", color: "white", fontWeight: 800, cursor: loading ? "default" : "pointer", opacity: loading ? 0.65 : 1 }}
            >
              {loading ? "Refreshing…" : "Refresh jobs"}
            </button>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter live jobs by title, employer or location"
            style={{ width: "100%", boxSizing: "border-box", marginTop: 14, border: "1px solid #cbd8d0", borderRadius: 12, padding: "11px 12px", font: "inherit" }}
          />
        </div>

        {error ? (
          <div style={{ padding: 20, color: "#8b3030", background: "#fff6f6" }}>{error}</div>
        ) : loading && !jobs.length ? (
          <div style={{ padding: 32, textAlign: "center", color: "#67776e" }}>Loading current Marlborough jobs…</div>
        ) : !filtered.length ? (
          <div style={{ padding: 32, textAlign: "center", color: "#67776e" }}>No matching live jobs found.</div>
        ) : (
          <div>
            {filtered.map((job) => (
              <article key={job.id} style={{ padding: 18, borderBottom: "1px solid #edf1ee", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#173f2d", fontSize: 19 }}>{job.title}</h3>
                    <div style={{ marginTop: 4, color: "#52655a" }}>{job.employer || "Employer not shown"}</div>
                  </div>
                  <span style={{ height: "fit-content", borderRadius: 999, padding: "5px 9px", background: "#edf5f0", color: "#244b37", fontSize: 12, fontWeight: 800 }}>
                    {job.source}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", color: "#64736a", fontSize: 14 }}>
                  <span>{job.location}</span>
                  {job.listedDate && <span>Listed {job.listedDate}</span>}
                  {job.closingDate && <span>Closes {job.closingDate}</span>}
                </div>
                <a href={job.url} target="_blank" rel="noreferrer" style={{ width: "fit-content", color: "#175b3b", fontWeight: 800, textDecoration: "none" }}>
                  Open original listing ↗
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
