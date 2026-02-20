# Custom Star Map — Print Studio

A free, scientifically accurate, print-ready star map generator. No server required — fully static.

## Quick Start

Open `index.html` directly in a browser, **or** deploy to any static host.

```
/
├── index.html           ← Entry point
├── style.css
├── app.js               ← Main wizard controller
├── js/
│   ├── astronomy.js     ← Celestial calculations
│   ├── starmap.js       ← SVG renderer
│   └── export.js        ← SVG + PDF download
├── data/
│   ├── stars.js         ← Star catalog (HYG/BSC subset)
│   ├── constellations.js← Constellation stick figures
│   └── dso.json         ← 150+ deep sky object catalog
└── assets/
    └── dso_thumbs/      ← DSO thumbnail images (SVG placeholders)
```

---

## Deploy on GitHub Pages

1. Push this entire folder to a GitHub repository.
2. Go to **Settings → Pages → Source: main branch / root**.
3. Your app will be live at `https://yourusername.github.io/repo-name/`.

No build step. No npm. Just upload and go.

---

## Deploy on Cloudflare Pages

1. Push to GitHub (or GitLab).
2. In Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect Git**.
3. Select your repo.
4. Build command: *(leave blank)*
5. Build output directory: `/` (root)
6. Click **Save and Deploy**.

Done. Cloudflare Pages serves static files with global CDN automatically.

---

## Replacing DSO Thumbnails

The `assets/dso_thumbs/` folder contains SVG placeholder icons. To replace them with real images:

1. Prepare your images (JPG or PNG recommended, square format, ~300×300 px minimum).
2. Name them to match `thumbnailPath` values in `data/dso.json`. For example:
   - `assets/dso_thumbs/M42.jpg`
   - `assets/dso_thumbs/M31.jpg`
3. Update `dso.json` entries to reference the new paths:
   ```json
   { "id": "M42", "thumbnailPath": "assets/dso_thumbs/M42.jpg", ... }
   ```
4. Optionally use per-type fallbacks as already configured (`galaxy_spiral.svg`, `nebula.svg`, etc.)

**Free astronomy image sources (check licenses before use):**
- NASA/ESA Hubble image archive: https://esahubble.org/images/
- NASA Image and Video Library: https://images.nasa.gov/
- NOIRLab image archive: https://noirlab.edu/public/images/
- ESO image archive: https://www.eso.org/public/images/

---

## Astronomy Library

This app uses **[astronomy-engine](https://github.com/cosinekitty/astronomy)** (MIT license) for:
- Moon phase and illumination
- Planet positions (Mercury–Neptune)
- Sun altitude
- Astronomical twilight calculation
- Observer-based coordinate transforms

**Why astronomy-engine?**
- Sub-arcsecond accuracy for planets and moon
- Pure JavaScript, no server
- Handles precession, nutation, aberration, refraction
- MIT licensed, well-maintained

**Star position accuracy:**
Stars are computed using a built-in IAU 1976 precession polynomial applied to J2000 RA/Dec catalog coordinates. This gives < 1 arcminute accuracy for dates within ±200 years of J2000. Proper motion (typically < 0.1°/century for catalog stars) is not applied. This is more than sufficient for a decorative poster.

---

## Accuracy Limitations

| Feature | Accuracy | Notes |
|---|---|---|
| Star positions (J2000 precessed) | ~1 arcmin | Proper motion ignored |
| Planet positions | < 1 arcsec | astronomy-engine |
| Moon phase | < 0.1% illumination | astronomy-engine |
| Sidereal time | < 1 arcsec | IAU 1982/2006 formula |
| Twilight times | ~1 min | astronomy-engine SearchAltitude |
| Milky Way shading | Approximate | Stylistic, not photometric |
| Constellation lines | Exact | IAU standard, Hipparcos IDs |

---

## Extending the DSO Catalog

Edit `data/dso.json`:

```json
{
  "catalog": [
    {
      "id": "NGC1234",
      "name": "My Nebula",
      "type": "nebula",
      "ra": 5.123,
      "dec": -12.5,
      "magnitude": 9.2,
      "size": 15,
      "constellation": "Ori",
      "iconic": false,
      "monthBuckets": [12, 1, 2],
      "thumbnailPath": "assets/dso_thumbs/nebula.svg",
      "funFact": "Discovered in 1888 by E.E. Barnard."
    }
  ],
  "monthlyBest": {
    "1": ["M42", "M45", "M1", ...10 IDs total...]
  }
}
```

**Type values:** `galaxy`, `nebula`, `open_cluster`, `globular_cluster`, `planetary_nebula`, `supernova_remnant`, `double_star`, `asterism`

---

## Local Development

No build step needed. If you hit CORS issues with `fetch('data/dso.json')` when opening the HTML file directly:

```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .

# Then open http://localhost:8080
```

---

## License

MIT. Astronomy-engine © Don Cross (MIT). Fonts via Google Fonts (OFL). Star catalog based on HYG Database (CC0).
