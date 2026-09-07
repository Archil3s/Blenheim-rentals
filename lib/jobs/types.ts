export type JobSource = "SEEK" | "Indeed" | "Other";

export type SavedJob = {
  id: string;
  title: string;
  employer: string;
  location: string;
  salary: string;
  source: JobSource;
  url: string;
  savedAt: string;
  notes?: string;
};
