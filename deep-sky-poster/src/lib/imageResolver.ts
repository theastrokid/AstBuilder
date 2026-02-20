/**
 * Astronomy image resolver — Messier & Caldwell only.
 *
 * Priority per object:
 *  1. Pre-built /data/image_cache.json
 *  2. localStorage cache (session)
 *  3. Curated Wikipedia direct title  (exact article, NO search — avoids montages)
 *     → URL is validated: skip if it contains "montage", "mosaic", "collage", etc.
 *  4. DESI Legacy Survey JPEG cutout  (real sky photo at the object's RA/Dec)
 *  5. Aladin HiPS2FITS – DSS2 colour  (guaranteed all-sky, actual photographic survey)
 *  6. null → starfield gradient placeholder
 *
 * Wikipedia SEARCH is intentionally omitted — it routinely returns
 * catalog montages, awards pages, and off-topic articles.
 */

import type { DeepSkyObject, ObjectClass } from '../types';

export type ImageCache = Record<string, string | null>;

const LS_PREFIX = 'dsp_img3_';      // bumped so stale bad URLs are discarded
const CACHE_VERSION = 'v3';
const LS_VERSION_KEY = 'dsp_cache_version3';

let memoryCache: ImageCache = {};

// ---------------------------------------------------------------------------
// Curated Wikipedia article titles (direct fetch, no search required).
// Covers all 110 Messier objects + common Caldwell entries.
// ---------------------------------------------------------------------------
const CURATED_WIKI: Record<string, string> = {
  // ── Messier ──────────────────────────────────────────────────────────────
  M1: 'Crab Nebula', M2: 'Messier 2', M3: 'Messier 3', M4: 'Messier 4',
  M5: 'Messier 5', M6: 'Butterfly Cluster', M7: 'Messier 7', M8: 'Lagoon Nebula',
  M9: 'Messier 9', M10: 'Messier 10', M11: 'Wild Duck Cluster', M12: 'Messier 12',
  M13: 'Hercules Cluster', M14: 'Messier 14', M15: 'Messier 15',
  M16: 'Eagle Nebula', M17: 'Omega Nebula', M18: 'Messier 18',
  M19: 'Messier 19', M20: 'Trifid Nebula', M21: 'Messier 21',
  M22: 'Messier 22', M23: 'Messier 23', M24: 'Sagittarius Star Cloud',
  M25: 'Messier 25', M26: 'Messier 26', M27: 'Dumbbell Nebula',
  M28: 'Messier 28', M29: 'Messier 29', M30: 'Messier 30',
  M31: 'Andromeda Galaxy', M32: 'Messier 32', M33: 'Triangulum Galaxy',
  M34: 'Messier 34', M35: 'Messier 35', M36: 'Messier 36',
  M37: 'Messier 37', M38: 'Messier 38', M39: 'Messier 39',
  M40: 'Messier 40', M41: 'Messier 41',
  M42: 'Orion Nebula', M43: "De Mairan's Nebula", M44: 'Beehive Cluster',
  M45: 'Pleiades', M46: 'Messier 46', M47: 'Messier 47', M48: 'Messier 48',
  M49: 'Messier 49', M50: 'Messier 50', M51: 'Whirlpool Galaxy',
  M52: 'Messier 52', M53: 'Messier 53', M54: 'Messier 54', M55: 'Messier 55',
  M56: 'Messier 56', M57: 'Ring Nebula', M58: 'Messier 58', M59: 'Messier 59',
  M60: 'Messier 60', M61: 'Messier 61', M62: 'Messier 62',
  M63: 'Sunflower Galaxy', M64: 'Black Eye Galaxy', M65: 'Messier 65',
  M66: 'Messier 66', M67: 'Messier 67', M68: 'Messier 68',
  M69: 'Messier 69', M70: 'Messier 70', M71: 'Messier 71',
  M72: 'Messier 72', M73: 'Messier 73', M74: 'Messier 74',
  M75: 'Messier 75', M76: 'Little Dumbbell Nebula',
  M77: 'Messier 77', M78: 'Messier 78', M79: 'Messier 79', M80: 'Messier 80',
  M81: "Bode's Galaxy", M82: 'Cigar Galaxy', M83: 'Southern Pinwheel Galaxy',
  M84: 'Messier 84', M85: 'Messier 85', M86: 'Messier 86', M87: 'Messier 87',
  M88: 'Messier 88', M89: 'Messier 89', M90: 'Messier 90', M91: 'Messier 91',
  M92: 'Messier 92', M93: 'Messier 93', M94: "Cat's Eye Galaxy",
  M95: 'Messier 95', M96: 'Messier 96', M97: 'Owl Nebula',
  M98: 'Messier 98', M99: 'Coma Pinwheel', M100: 'Messier 100',
  M101: 'Pinwheel Galaxy', M102: 'Messier 102', M103: 'Messier 103',
  M104: 'Sombrero Galaxy', M105: 'Messier 105', M106: 'Messier 106',
  M107: 'Messier 107', M108: 'Surfboard Galaxy', M109: 'Messier 109',
  M110: 'Messier 110',
  // ── Caldwell ─────────────────────────────────────────────────────────────
  C1: 'NGC 188', C2: 'NGC 40', C3: 'NGC 4236', C4: 'NGC 7023',
  C5: 'IC 342', C6: "Cat's Eye Nebula", C7: 'NGC 2403',
  C9: 'Cave Nebula', C10: 'NGC 663', C11: 'Bubble Nebula',
  C12: 'NGC 6946', C13: 'NGC 457', C14: 'Double Cluster',
  C15: 'Double Cluster', C16: 'NGC 7243', C17: 'NGC 7662',
  C18: 'NGC 185', C19: 'IC 5146', C20: 'North America Nebula',
  C22: 'NGC 7662', C23: 'NGC 891', C25: 'NGC 2419',
  C26: 'NGC 4244', C27: 'Crescent Nebula', C28: 'NGC 752',
  C29: 'NGC 40', C30: 'NGC 7331', C31: 'Flaming Star Nebula',
  C32: 'NGC 4631', C33: 'NGC 6992', C34: 'NGC 6960',
  C39: 'Eskimo Nebula', C41: 'Hyades', C42: 'NGC 5128',
  C43: 'NGC 4169', C44: 'NGC 7479', C46: 'NGC 2261',
  C49: 'Rosette Nebula', C50: 'IC 2391', C51: 'IC 1613',
  C53: 'Spindle Galaxy', C55: 'Saturn Nebula', C57: 'NGC 6822',
  C58: 'NGC 2360', C59: 'Ghost of Jupiter', C60: 'Antennae Galaxies',
  C63: 'Helix Nebula', C64: 'NGC 253', C65: 'Centaurus A',
  C67: 'NGC 1097', C69: 'Bug Nebula', C70: 'NGC 300',
  C74: 'Eight Burst Nebula', C76: 'NGC 6231', C77: 'NGC 5128',
  C78: 'NGC 6541', C80: 'Omega Centauri', C82: 'NGC 6752',
  C83: 'NGC 4945', C86: 'NGC 6397', C91: 'NGC 3532',
  C92: 'Carina Nebula', C94: 'Jewel Box', C99: 'Coalsack Nebula',
  C103: 'Tarantula Nebula', C106: 'NGC 104',
};

// URL patterns that indicate a montage / catalog page rather than a single-object image
const MONTAGE_PATTERNS = [
  'montage', 'mosaic', 'composite', 'collage', 'catalog', 'compilation',
  'collection', 'atlas', 'list_of', 'chart', 'plate_', 'survey_field',
  'Messier_objects', 'Caldwell_catalogue',
];

function isMontage(url: string): boolean {
  const u = url.toLowerCase();
  return MONTAGE_PATTERNS.some((p) => u.includes(p));
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------
export async function loadJsonCache(url = './data/image_cache.json'): Promise<ImageCache> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return {};
    return (await resp.json()) as ImageCache;
  } catch { return {}; }
}

export async function initImageCache(): Promise<void> {
  if (localStorage.getItem(LS_VERSION_KEY) !== CACHE_VERSION) {
    clearLocalStorageCache();
    localStorage.setItem(LS_VERSION_KEY, CACHE_VERSION);
  }
  const jsonCache = await loadJsonCache();
  memoryCache = { ...jsonCache };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(LS_PREFIX)) {
      const id = key.slice(LS_PREFIX.length);
      if (!(id in memoryCache)) {
        const val = localStorage.getItem(key);
        memoryCache[id] = val === 'null' ? null : val;
      }
    }
  }
}

function clearLocalStorageCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(LS_PREFIX)) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

function setCached(id: string, url: string | null): void {
  memoryCache[id] = url;
  try { localStorage.setItem(LS_PREFIX + id, url === null ? 'null' : url); } catch {}
}

// ---------------------------------------------------------------------------
// Tier 1 — Wikipedia direct fetch (curated titles only, NO search)
// ---------------------------------------------------------------------------
async function tryWikipediaDirect(title: string): Promise<string | null> {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return null;
    const data = await resp.json() as {
      thumbnail?: { source: string; width: number; height: number };
      description?: string;
    };
    const src = data?.thumbnail?.source;
    if (!src) return null;
    if (isMontage(src)) return null;           // skip catalog-composite images
    if ((data.thumbnail?.width ?? 0) < 200) return null; // too small
    return src;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Tier 2 — DESI Legacy Survey JPEG cutout  (real colour sky photo)
// Coverage: all-sky (ls-dr10 for dec > -30, decals-dr5 for south)
// ---------------------------------------------------------------------------
function getFovArcmin(cls: ObjectClass): number {
  switch (cls) {
    case 'Planetary Nebula': return 6;
    case 'Globular Cluster': return 18;
    case 'Star Cluster':     return 55;
    case 'Galaxy':           return 28;
    case 'Nebula':           return 65;
    default:                 return 35;
  }
}

async function tryLegacySurvey(ra: number, dec: number, cls: ObjectClass): Promise<string | null> {
  const fov    = getFovArcmin(cls);
  const pxscale = (fov * 60) / 768;                  // arcsec/pix for 768-px output
  const layer  = dec > -30 ? 'ls-dr10' : 'decals-dr5';
  const url    =
    `https://www.legacysurvey.org/viewer/jpeg-cutout` +
    `?ra=${ra.toFixed(6)}&dec=${dec.toFixed(6)}` +
    `&size=768&layer=${layer}&pixscale=${pxscale.toFixed(4)}`;
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    if (resp.ok && (resp.headers.get('content-type') ?? '').startsWith('image')) {
      return url;
    }
    return null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Tier 3 — Aladin HiPS2FITS (DSS2 colour — guaranteed all-sky)
// ---------------------------------------------------------------------------
async function tryAladin(ra: number, dec: number, cls: ObjectClass): Promise<string | null> {
  const fovDeg = getFovArcmin(cls) / 60;
  const url =
    `https://aladin.cds.unistra.fr/hips-image-services/hips2fits` +
    `?hips=CDS%2FP%2FDSS2%2Fcolor` +
    `&ra=${ra.toFixed(6)}&dec=${dec.toFixed(6)}` +
    `&fov=${fovDeg.toFixed(5)}&width=900&height=900&format=png`;
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    return resp.ok ? url : null;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Public resolver
// ---------------------------------------------------------------------------
export async function resolveImage(obj: DeepSkyObject): Promise<string | null> {
  const key = obj.id;
  if (key in memoryCache) return memoryCache[key];

  let resolved: string | null = null;

  // ── Tier 1: Curated Wikipedia (specific known article) ──
  const wikiTitle = CURATED_WIKI[obj.id];
  if (wikiTitle) {
    resolved = await tryWikipediaDirect(wikiTitle);
  }

  // ── Tier 2: DESI Legacy Survey (actual sky photo) ──
  if (!resolved) {
    resolved = await tryLegacySurvey(obj.raDecimal, obj.decDecimal, obj.normalizedClass);
  }

  // ── Tier 3: Aladin DSS2 (guaranteed all-sky photographic survey) ──
  if (!resolved) {
    resolved = await tryAladin(obj.raDecimal, obj.decDecimal, obj.normalizedClass);
  }

  setCached(key, resolved);
  return resolved;
}

export async function resolveImages(
  objects: DeepSkyObject[],
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  let done = 0;
  const BATCH = 3;
  for (let i = 0; i < objects.length; i += BATCH) {
    const batch = objects.slice(i, i + BATCH);
    const urls  = await Promise.all(batch.map((o) => resolveImage(o)));
    batch.forEach((o, idx) => { result[o.id] = urls[idx]; });
    done += batch.length;
    onProgress?.(Math.min(done, objects.length), objects.length);
    if (i + BATCH < objects.length) await new Promise((r) => setTimeout(r, 220));
  }
  return result;
}

export function getMemoryCache(): ImageCache { return { ...memoryCache }; }
