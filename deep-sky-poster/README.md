# Deep Sky Poster Generator ✦

Generate a personalised deep-sky object poster from any name or pair of names.
The letters are algorithmically converted to sky coordinates, the closest
deep-sky objects are found in the master catalog, and a 1024 × 1536 px
poster is rendered in the browser and exported as a PNG.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Ensure the catalog is in place (already done if cloned):
#    public/data/master_catalog.csv

# 3. Start the dev server
npm run dev
# → open http://localhost:5173
```

---

## Data Files

| Path | Description |
|------|-------------|
| `public/data/master_catalog.csv` | Master catalog (417 Messier + Caldwell + NGC objects). Converted from the provided XLSX. |
| `public/data/image_cache.json`   | Pre-built image URL cache (see below). Starts empty; populated by the build script or the app at runtime. |

### Refreshing the Image Cache

The app resolves images at runtime via the Wikipedia/Wikimedia API and
caches results in `localStorage`. To **pre-build** the full cache for all
417 objects (recommended before deploying):

```bash
npm run build-cache
```

This runs `scripts/buildImageCache.mjs`, queries Wikipedia for every object,
and writes results to `public/data/image_cache.json`.

Options (environment variables):

| Var | Default | Description |
|-----|---------|-------------|
| `CONCURRENCY` | `3` | Parallel requests |
| `DELAY_MS` | `200` | Delay between batches (ms) |
| `FORCE` | `0` | Set to `1` to re-fetch cached entries |

```bash
CONCURRENCY=5 DELAY_MS=300 npm run build-cache
# Force re-fetch all:
FORCE=1 npm run build-cache
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server at localhost:5173 |
| `npm run build` | TypeScript check + Vite production build → `dist/` |
| `npm run preview` | Preview production build locally |
| `npm test` | Run unit tests (vitest) |
| `npm run test:watch` | Watch mode tests |
| `npm run build-cache` | Pre-populate the Wikipedia image cache |

---

## Deploying

```bash
npm run build
# Upload the dist/ folder to any static host (Netlify, Vercel, GitHub Pages, etc.)
```

Make sure `public/data/` files are included in the build output (they are by default with Vite).

---

## Name → Coordinates Algorithm

1. **Strip** all non-alphabetic characters (spaces, `&`, punctuation).
   Uppercase the remaining letters.
2. **Convert** each letter to a two-character number: `A=01 … Z=26`.
3. **Split** each two-character number into individual digits and concatenate them into a _digit stream_.
4. **Repeat** the stream until it has ≥ 12 digits, then take the first 12.
5. **Group** into pairs:
   - Digits 1–2: RA hours (HH)
   - Digits 3–4: RA minutes (MM)
   - Digits 5–6: RA seconds (SS)
   - Digits 7–8: Dec degrees (DD)
   - Digits 9–10: Dec arcminutes (DM)
   - Digits 11–12: Dec arcseconds (DS)
6. **Sign rule**: look at the 2nd letter of the combined input; convert to 1–26.
   Odd → `+`, Even → `−`.
7. **Wrap/validate**:
   `HH mod 24`, `MM mod 60`, `SS mod 60`, `DD mod 90`, `DM mod 60`, `DS mod 60`.

**Example** — "EMI" + "ELI" → combined letters "EMIELI":

```
E=05 M=13 I=09 E=05 L=12 I=09
Digit stream: 0 5 1 3 0 9 0 5 1 2 0 9  (exactly 12)
RA:  HH=05  MM=13  SS=09  →  05h 13m 09s
Dec: DD=05  DM=12  DS=09  →  sign: M=13(odd) → +05° 12′ 09″
```

---

## Closest Object Logic

For each of the 5 normalised classes — **Galaxy**, **Planetary Nebula**,
**Star Cluster**, **Nebula**, **Globular Cluster** — the app computes the
great-circle angular separation (haversine formula) to every object in the
catalog and selects the single closest object in that class.

The **main** object on the poster is:
- The closest object in the user-selected class (if a primary type was chosen), or
- The globally closest object among the 5 class winners.

The remaining 4 class winners appear in the bottom strip.

---

## Image Sourcing

1. Check `public/data/image_cache.json` (pre-built) and `localStorage`.
2. Try `en.wikipedia.org/api/rest_v1/page/summary/<name>` → `thumbnail.source`.
3. Fall back to Wikipedia search API → top result → summary image.
4. Fall back to Wikimedia Commons file search.
5. If all fail: render a tasteful starfield gradient placeholder.

Images are cached in `localStorage` keyed by object ID so subsequent
poster generations are instant.

---

## Project Structure

```
deep-sky-poster/
├── public/
│   └── data/
│       ├── master_catalog.csv   ← catalog data (place here)
│       └── image_cache.json     ← pre-built image URLs
├── scripts/
│   └── buildImageCache.mjs      ← Node.js cache builder
├── src/
│   ├── types/index.ts
│   ├── lib/
│   │   ├── nameToCoords.ts      ← name → RA/Dec algorithm
│   │   ├── coordsParser.ts      ← parse RA/Dec strings from CSV
│   │   ├── angularDistance.ts   ← haversine formula
│   │   ├── catalogParser.ts     ← CSV → DeepSkyObject[]
│   │   ├── objectFinder.ts      ← find closest objects
│   │   ├── imageResolver.ts     ← Wikipedia + cache layer
│   │   └── posterRenderer.ts    ← Canvas 1024×1536 renderer
│   ├── components/
│   │   ├── PosterForm.tsx
│   │   ├── PosterCanvas.tsx
│   │   └── ObjectList.tsx
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── README.md
```

---

## Troubleshooting

**"Catalog appears empty"** — make sure `public/data/master_catalog.csv` exists with the correct header row.

**Images not loading / canvas export blocked** — cross-origin images can taint the canvas. The app falls back to placeholder gradients automatically. Pre-building the cache (`npm run build-cache`) then serving from your own domain avoids most CORS issues.

**Download fails (canvas tainted)** — this happens when a Wikipedia image doesn't send the correct CORS headers. Regenerate the poster; it will use the placeholder gradient which is always exportable.
