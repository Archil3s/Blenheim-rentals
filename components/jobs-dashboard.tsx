"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { JobSource, SavedJob } from "@/lib/jobs/types";

const STORAGE_KEY = "blenheim-rentals:saved-jobs:v1";

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function seekUrl(query: string) {
  const keyword = query
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return keyword
    ? `https://www.seek.co.nz/${encodeURIComponent(keyword)}-jobs/in-Blenheim-Marlborough`
    : "https://www.seek.co.nz/jobs/in-Blenheim-Marlborough";
}

function indeedUrl(query: string) {
  const params = new URLSearchParams({
    l: "Blenheim, Marlborough",
    sort: "date",
  });
  if (query.trim()) params.set("q", query.trim());
  return `https://nz.indeed.com/jobs?${params.toString()}`;
}

function readJobs() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? (parsed as SavedJob[]) : [];
  } catch {
    return [];
  }
}

export function JobsDashboard() {
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<SavedJob[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [employer, setEmployer] = useState("");
  const [location, setLocation] = useState("Blenheim, Marlborough");
  const [salary, setSalary] = useState("");
  const [source, setSource] = useState<JobSource>("SEEK");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setJobs(readJobs());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs, loaded]);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()),
    [jobs],
  );

  function addJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !url.trim()) {
      setMessage("Add a job title and the original listing link.");
      return;
    }

    const saved: SavedJob = {
      id: makeId(),
      title: title.trim(),
      employer: employer.trim(),
      location: location.trim() || "Blenheim, Marlborough",
      salary: salary.trim(),
      source,
      url: url.trim(),
      savedAt: new Date().toISOString(),
      notes: notes.trim(),
    };

    setJobs((current) => [saved, ...current]);
    setTitle("");
    setEmployer("");
    setSalary("");
    setUrl("");
    setNotes("");
    setMessage("Job saved to your diary.");
    setShowAdd(false);
  }

  async function exportDiary() {
    if (!jobs.length || exporting) return;
    setExporting(true);
    setMessage("");
    try {
      const response = await fetch("/api/job-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: sortedJobs }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Could not export the job diary.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || "Job Search Diary.docx";
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setMessage(`Exported ${jobs.length} saved job${jobs.length === 1 ? "" : "s"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not export the job diary.");
    } finally {
      setExporting(false);
    }
  }

  const panel = {
    border: "1px solid #dce5df",
    borderRadius: 20,
    background: "white",
    boxShadow: "0 12px 30px rgba(23,63,45,.06)",
  } as const;

  const field = {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #cbd8d0",
    borderRadius: 12,
    padding: "11px 12px",
    font: "inherit",
    background: "#fff",
  };

  const button = {
    border: 0,
    borderRadius: 12,
    padding: "11px 14px",
    fontWeight: 800,
    cursor: "pointer",
  } as const;

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px 60px" }}>
      <section style={{ ...panel, padding: 22, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#557063", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}>
              Blenheim & Marlborough
            </div>
            <h1 style={{ margin: "6px 0 8px", color: "#173f2d", fontSize: "clamp(28px,5vw,42px)" }}>Job Finder</h1>
            <p style={{ margin: 0, color: "#52655a", maxWidth: 720, lineHeight: 1.6 }}>
              Search current jobs on SEEK and Indeed, then save the useful listings here and export them into a Job Search Diary.
            </p>
          </div>
          <div style={{ alignSelf: "center", minWidth: 145, padding: "14px 18px", borderRadius: 16, background: "#edf5f0", color: "#173f2d", textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: 30 }}>{jobs.length}</strong>
            <span style={{ fontSize: 13, fontWeight: 700 }}>saved jobs</span>
          </div>
        </div>
      </section>

      <section style={{ ...panel, padding: 20, marginBottom: 18 }}>
        <label htmlFor="job-search" style={{ display: "block", fontWeight: 800, color: "#244b37", marginBottom: 8 }}>
          What kind of job?
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 10 }}>
          <input
            id="job-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. support worker, HR, warehouse, administration"
            style={field}
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={seekUrl(query)} target="_blank" rel="noreferrer" style={{ ...button, background: "#173f2d", color: "white", textDecoration: "none" }}>
              Search SEEK ↗
            </a>
            <a href={indeedUrl(query)} target="_blank" rel="noreferrer" style={{ ...button, background: "#2457a7", color: "white", textDecoration: "none" }}>
              Search Indeed ↗
            </a>
            <button type="button" onClick={() => setShowAdd((value) => !value)} style={{ ...button, background: "#edf3ef", color: "#173f2d" }}>
              + Save a job
            </button>
          </div>
        </div>
        <p style={{ margin: "12px 0 0", color: "#6a786f", fontSize: 13, lineHeight: 1.5 }}>
          Searches open the original job sites. This app does not scrape or republish SEEK/Indeed listings; save only the jobs you want in your personal diary.
        </p>
      </section>

      {showAdd && (
        <section style={{ ...panel, padding: 20, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0, color: "#173f2d" }}>Save job to diary</h2>
          <form onSubmit={addJob} style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Job title *" style={field} />
              <input value={employer} onChange={(event) => setEmployer(event.target.value)} placeholder="Employer" style={field} />
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location" style={field} />
              <input value={salary} onChange={(event) => setSalary(event.target.value)} placeholder="Salary / pay (if listed)" style={field} />
              <select value={source} onChange={(event) => setSource(event.target.value as JobSource)} style={field}>
                <option value="SEEK">SEEK</option>
                <option value="Indeed">Indeed</option>
                <option value="Other">Other</option>
              </select>
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Original listing URL *" inputMode="url" style={field} />
            </div>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Notes (optional)" rows={3} style={{ ...field, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" style={{ ...button, background: "#173f2d", color: "white" }}>Save to diary</button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ ...button, background: "#eef2ef", color: "#365342" }}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section style={{ ...panel, overflow: "hidden" }}>
        <div style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", borderBottom: "1px solid #e4ebe7" }}>
          <div>
            <h2 style={{ margin: 0, color: "#173f2d" }}>Saved job diary</h2>
            <p style={{ margin: "5px 0 0", color: "#67776e", fontSize: 14 }}>Stored on this device until you remove it.</p>
          </div>
          <button
            type="button"
            onClick={exportDiary}
            disabled={!jobs.length || exporting}
            style={{ ...button, background: jobs.length ? "#173f2d" : "#dce4df", color: jobs.length ? "white" : "#758078", opacity: exporting ? 0.7 : 1 }}
          >
            {exporting ? "Creating diary…" : "Export Job Search Diary"}
          </button>
        </div>

        {message && <div role="status" style={{ padding: "11px 20px", background: "#f4f8f5", color: "#365342", borderBottom: "1px solid #e4ebe7" }}>{message}</div>}

        {!sortedJobs.length ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#6a786f" }}>
            No jobs saved yet. Search SEEK or Indeed, then use <strong>Save a job</strong> for anything worth following up.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 0 }}>
            {sortedJobs.map((job) => (
              <article key={job.id} style={{ padding: 18, borderBottom: "1px solid #edf1ee", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#173f2d", fontSize: 19 }}>{job.title}</h3>
                    <div style={{ color: "#52655a", marginTop: 4 }}>{job.employer || "Employer not recorded"} · {job.location}</div>
                  </div>
                  <span style={{ flex: "0 0 auto", borderRadius: 999, padding: "5px 9px", background: "#edf5f0", color: "#244b37", fontSize: 12, fontWeight: 800 }}>{job.source}</span>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14, color: "#64736a" }}>
                  <span>{job.salary || "Salary not listed"}</span>
                  <span>Saved {new Date(job.savedAt).toLocaleDateString("en-NZ")}</span>
                </div>
                {job.notes && <div style={{ color: "#52655a", lineHeight: 1.5 }}>{job.notes}</div>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <a href={job.url} target="_blank" rel="noreferrer" style={{ color: "#175b3b", fontWeight: 800, textDecoration: "none" }}>Open listing ↗</a>
                  <button type="button" onClick={() => setJobs((current) => current.filter((item) => item.id !== job.id))} style={{ border: 0, background: "transparent", color: "#9a3c3c", fontWeight: 700, cursor: "pointer", padding: 0 }}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
