import type { Location, Settings } from '../types';

const PREFIX = 'wcist_';

function key(k: string) { return PREFIX + k; }

// ── Generic helpers ──────────────────────────────────────────────────────────
export function storeGet<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(key(k));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function storeSet<T>(k: string, value: T): void {
  try {
    localStorage.setItem(key(k), JSON.stringify(value));
  } catch {
    // Storage full or blocked — fail silently
  }
}

export function storeRemove(k: string): void {
  try {
    localStorage.removeItem(key(k));
  } catch { /* ignore */ }
}

// ── App-specific helpers ─────────────────────────────────────────────────────
export function loadLocation(): Location | null {
  return storeGet<Location>('location');
}

export function saveLocation(loc: Location): void {
  storeSet('location', loc);
}

export function loadSettings(): Settings | null {
  return storeGet<Settings>('settings');
}

export function saveSettings(s: Settings): void {
  storeSet('settings', s);
}

// ── Wikipedia image cache ────────────────────────────────────────────────────
const WIKI_CACHE_KEY = 'wiki_images';
const WIKI_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface WikiCache {
  [title: string]: { url: string | null; ts: number };
}

export function wikiImageGet(title: string): string | null | undefined {
  const cache = storeGet<WikiCache>(WIKI_CACHE_KEY) ?? {};
  const entry = cache[title];
  if (!entry) return undefined; // not cached
  if (Date.now() - entry.ts > WIKI_CACHE_TTL) return undefined; // expired
  return entry.url; // null means "no image found"
}

export function wikiImageSet(title: string, url: string | null): void {
  const cache = storeGet<WikiCache>(WIKI_CACHE_KEY) ?? {};
  cache[title] = { url, ts: Date.now() };
  storeSet(WIKI_CACHE_KEY, cache);
}

// ── Geocode cache ────────────────────────────────────────────────────────────
const GEO_CACHE_KEY = 'geocode_cache';
const GEO_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

interface GeoCache {
  [query: string]: { results: unknown[]; ts: number };
}

export function geoCacheGet(query: string): unknown[] | null {
  const cache = storeGet<GeoCache>(GEO_CACHE_KEY) ?? {};
  const entry = cache[query.toLowerCase()];
  if (!entry) return null;
  if (Date.now() - entry.ts > GEO_CACHE_TTL) return null;
  return entry.results;
}

export function geoCacheSet(query: string, results: unknown[]): void {
  const cache = storeGet<GeoCache>(GEO_CACHE_KEY) ?? {};
  cache[query.toLowerCase()] = { results, ts: Date.now() };
  storeSet(GEO_CACHE_KEY, cache);
}
