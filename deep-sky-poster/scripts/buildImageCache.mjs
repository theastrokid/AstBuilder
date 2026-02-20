/**
 * Build script: pre-fetches Wikipedia images for every object in the catalog
 * and writes the results to public/data/image_cache.json.
 *
 * Usage:
 *   node scripts/buildImageCache.mjs
 *
 * Options (env vars):
 *   CONCURRENCY=3   Max parallel requests (default: 3)
 *   DELAY_MS=200    Delay between batches in ms (default: 200)
 *   FORCE=1         Re-fetch even if entry already exists in cache
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Load catalog (CSV)
// ---------------------------------------------------------------------------
const csvPath = path.join(ROOT, 'public', 'data', 'master_catalog.csv');
const cachePath = path.join(ROOT, 'public', 'data', 'image_cache.json');

if (!existsSync(csvPath)) {
  console.error(`❌  Catalog not found at ${csvPath}`);
  console.error('   Place master_catalog.csv in public/data/ first.');
  process.exit(1);
}

// Very simple CSV parser (no external deps needed in the script)
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(1).map((line) => {
    // Naive split – good enough for this catalog's quoting style
    const cols = line.split(',');
    return {
      catalog: (cols[0] ?? '').trim(),
      id: (cols[1] ?? '').trim(),
      name: (cols[2] ?? '').trim().split(',')[0].trim(),
      type: (cols[3] ?? '').trim(),
    };
  }).filter((r) => r.id);
}

const csv = readFileSync(csvPath, 'utf-8');
const objects = parseCSV(csv);

// Load existing cache
let cache = {};
if (existsSync(cachePath)) {
  try { cache = JSON.parse(readFileSync(cachePath, 'utf-8')); } catch {}
}

const FORCE = process.env.FORCE === '1';
const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? '3', 10);
const DELAY_MS = parseInt(process.env.DELAY_MS ?? '200', 10);

// ---------------------------------------------------------------------------
// Wikipedia fetch helpers
// ---------------------------------------------------------------------------
async function fetchJSON(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'DeepSkyPosterBot/1.0 (educational project)' },
  });
  if (!resp.ok) return null;
  return resp.json().catch(() => null);
}

async function tryWpSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const data = await fetchJSON(url);
  return data?.thumbnail?.source ?? null;
}

async function tryWpSearch(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
  const data = await fetchJSON(url);
  const results = data?.query?.search ?? [];
  for (const r of results.slice(0, 2)) {
    const img = await tryWpSummary(r.title);
    if (img) return img;
  }
  return null;
}

async function tryCommons(query) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3&srnamespace=6`;
  const data = await fetchJSON(url);
  const results = data?.query?.search ?? [];
  if (!results.length) return null;

  const fileTitle = results[0].title;
  const imgUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
  const imgData = await fetchJSON(imgUrl);
  const pages = imgData?.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page?.imageinfo?.[0]?.url ?? null;
}

function buildQueries(obj) {
  const queries = [];
  const isGeneric = /^(NGC|IC|UGC)\s*\d+$/i.test(obj.name);
  if (!isGeneric && obj.name.length > 2) {
    queries.push(obj.name);
    queries.push(`${obj.name} ${obj.type}`);
  }
  queries.push(obj.id);
  queries.push(`${obj.id} ${obj.type}`);
  return [...new Set(queries)];
}

async function resolveOne(obj) {
  const queries = buildQueries(obj);
  for (const q of queries) {
    let img = await tryWpSummary(q);
    if (img) return img;
    img = await tryWpSearch(q);
    if (img) return img;
    img = await tryCommons(q + ' astronomy');
    if (img) return img;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const toProcess = FORCE
  ? objects
  : objects.filter((o) => !(o.id in cache));

console.log(`\n✦ Deep Sky Poster – Image Cache Builder`);
console.log(`  Catalog: ${objects.length} objects`);
console.log(`  To fetch: ${toProcess.length} (FORCE=${FORCE})`);
console.log(`  Concurrency: ${CONCURRENCY}, delay: ${DELAY_MS}ms\n`);

let done = 0;
let found = 0;
let missing = 0;

function save() {
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
}

for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
  const batch = toProcess.slice(i, i + CONCURRENCY);

  await Promise.all(
    batch.map(async (obj) => {
      try {
        const url = await resolveOne(obj);
        cache[obj.id] = url;
        done++;
        if (url) { found++; process.stdout.write(`  ✓ ${obj.id.padEnd(12)} ${url.slice(0, 60)}\n`); }
        else       { missing++; process.stdout.write(`  ✗ ${obj.id.padEnd(12)} no image found\n`); }
      } catch (err) {
        cache[obj.id] = null;
        missing++;
        process.stdout.write(`  ! ${obj.id.padEnd(12)} error: ${err.message}\n`);
      }
    }),
  );

  // Save incrementally after each batch
  save();

  if (i + CONCURRENCY < toProcess.length) {
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
}

console.log(`\n✦ Done: ${found} images found, ${missing} missing`);
console.log(`  Cache saved to ${cachePath}\n`);
