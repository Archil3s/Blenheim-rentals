const BAD_IMAGE_HINTS = /(?:logo|icon|avatar|favicon|sprite|placeholder|loading|tracking|pixel|badge|brand|agent|profile|social)/i;

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function absoluteImageUrl(value: string, baseUrl: string): string | null {
  const decoded = decodeHtmlAttribute(value.trim());
  if (!decoded || decoded.startsWith("data:") || decoded.startsWith("blob:")) return null;

  try {
    const url = new URL(decoded, baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (BAD_IMAGE_HINTS.test(`${url.pathname} ${url.search}`)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function attribute(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i");
  return tag.match(pattern)?.[2] ?? null;
}

function srcsetCandidate(value: string): string | null {
  const candidates = value
    .split(",")
    .map((item) => item.trim().split(/\s+/)[0])
    .filter(Boolean);
  return candidates.at(-1) ?? null;
}

export function extractListingImages(html: string, baseUrl: string, limit = 8): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  const add = (value?: string | null) => {
    if (!value || images.length >= limit) return;
    const url = absoluteImageUrl(value, baseUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    images.push(url);
  };

  // Listing detail pages usually expose the hero image through Open Graph/Twitter metadata.
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = (attribute(tag, "property") ?? attribute(tag, "name") ?? "").toLowerCase();
    if (key === "og:image" || key === "og:image:url" || key === "twitter:image") {
      add(attribute(tag, "content"));
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    if (images.length >= limit) break;
    const tag = match[0];
    const alt = attribute(tag, "alt") ?? "";
    const className = attribute(tag, "class") ?? "";
    if (BAD_IMAGE_HINTS.test(`${alt} ${className}`)) continue;

    const srcset = attribute(tag, "srcset") ?? attribute(tag, "data-srcset");
    if (srcset) add(srcsetCandidate(srcset));
    add(attribute(tag, "data-src"));
    add(attribute(tag, "data-lazy-src"));
    add(attribute(tag, "src"));
  }

  return images;
}
