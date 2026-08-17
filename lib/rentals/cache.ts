import type { RentalFeed } from "./types";

type CacheEntry = {
  value: RentalFeed;
  createdAt: number;
};

let cache: CacheEntry | null = null;

function readPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const CACHE_TTL_MS = readPositiveNumber(process.env.CACHE_TTL_MS, 3 * 60 * 1000);
const MIN_FORCE_REFRESH_AGE_MS = readPositiveNumber(
  process.env.MIN_FORCE_REFRESH_AGE_MS,
  30 * 1000,
);

export function getCachedFeed(forceRefresh = false) {
  if (!cache) return null;

  const age = Date.now() - cache.createdAt;

  if (forceRefresh && age >= MIN_FORCE_REFRESH_AGE_MS) {
    return null;
  }

  if (!forceRefresh && age >= CACHE_TTL_MS) {
    return null;
  }

  return cache;
}

export function setCachedFeed(value: RentalFeed) {
  cache = {
    value,
    createdAt: Date.now(),
  };
}
