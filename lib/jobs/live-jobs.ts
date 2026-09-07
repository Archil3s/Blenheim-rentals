export type LiveJob = {
  id: string;
  title: string;
  employer: string;
  location: string;
  listedDate: string;
  closingDate: string;
  source: string;
  url: string;
};

const GOVT_JOBS_URL =
  'https://jobs.govt.nz/jobtools/jncustomsearch.searchResults?in_jobDate=All&in_location=%22Marlborough%22&in_organid=16563&in_sessionid=';

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(href: string) {
  try {
    return new URL(decodeHtml(href), GOVT_JOBS_URL).toString();
  } catch {
    return GOVT_JOBS_URL;
  }
}

function idFromUrl(url: string, title: string) {
  const match = url.match(/[?&](?:in_jobid|jobid|id)=([^&]+)/i);
  return match?.[1] ? `govt-${match[1]}` : `govt-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export async function fetchGovernmentJobs(): Promise<LiveJob[]> {
  const response = await fetch(GOVT_JOBS_URL, {
    headers: {
      'User-Agent': 'Blenheim-Rentals-Job-Finder/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`NZ Government Jobs returned ${response.status}`);
  const html = await response.text();
  const jobs: LiveJob[] = [];

  for (const rowMatch of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => match[1]);
    if (cells.length < 4) continue;

    const anchor = cells[0].match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!anchor) continue;

    const titleCell = stripHtml(anchor[2]);
    const titleParts = titleCell.split(/\s+at\s+/i);
    const title = titleParts[0]?.trim() || titleCell;
    const employer = titleParts.slice(1).join(' at ').replace(/\s+-\s*$/, '').trim();
    const location = stripHtml(cells[1]);
    const listedDate = stripHtml(cells[2]);
    const closingDate = stripHtml(cells[3]);
    const url = absoluteUrl(anchor[1]);

    if (!title || /position|results/i.test(title)) continue;

    jobs.push({
      id: idFromUrl(url, title),
      title,
      employer,
      location,
      listedDate,
      closingDate,
      source: 'NZ Government Jobs',
      url,
    });
  }

  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.title.toLowerCase()}|${job.employer.toLowerCase()}|${job.location.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return /marlborough|blenheim|nelson/i.test(job.location);
  });
}

export async function fetchLiveJobs() {
  const settled = await Promise.allSettled([fetchGovernmentJobs()]);
  return settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
}
