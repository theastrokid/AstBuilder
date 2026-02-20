import jsPDF from 'jspdf';
import * as Astronomy from 'astronomy-engine';
import type { RankedTarget, NightWindow, Location, Settings, DeepSkyTarget } from '../types';
import {
  formatTime, formatDate, getMoonPhaseName, getMoonEmoji,
  computeNightWindow, rankTargetsForTonight,
} from './astronomy';
import { imageUrlToDataUrl, fetchWikiImage } from './wikipedia';
import { computeFOV } from '../components/FOVPreview';
import { DEFAULT_TELESCOPE, DEFAULT_CAMERA } from '../data/presets';

// ── Shared layout constants (landscape A4 = 297 × 210 mm) ────────────────────
const COLS = 4;
const ROWS = 3;
const MAX_TARGETS = COLS * ROWS;  // 12

const PW = 297;           // page width  mm
const PH = 210;           // page height mm
const PM = 10;            // page margin mm
const CW = PW - PM * 2;  // content width = 277 mm

const HDR_BAR  = 8;
const HDR_INFO = 21;
const HDR_H    = HDR_BAR + HDR_INFO;  // 29 mm

const GRID_START = HDR_H + 2;   // 31 mm
const CGAP = 3;
const RGAP = 3;

// ── Tonight-report card grid (full height) ────────────────────────────────────
const GRID_H    = PH - GRID_START - PM;                           // 169 mm
const CARD_W    = (CW - CGAP * (COLS - 1)) / COLS;               // ≈ 67 mm
const CARD_H    = (GRID_H - RGAP * (ROWS - 1)) / ROWS;           // ≈ 54.33 mm
const IMG_H     = Math.round(CARD_H * 0.54);                      // ≈ 29 mm
const INFO_H    = CARD_H - IMG_H;                                  // ≈ 25.33 mm

// ── Monthly-report: main grid (4 × 2 = 8 objects) ────────────────────────────
const M_MAIN_COLS    = 4;
const M_MAIN_ROWS    = 2;
const M_MAIN_MAX     = M_MAIN_COLS * M_MAIN_ROWS;   // 8
const M_CARD_H       = 36;                            // mm per main card
const M_IMG_H        = 20;                            // mm image height (main)
const M_INFO_H       = M_CARD_H - M_IMG_H;           // 16 mm
const M_MAIN_GRID_H  = M_MAIN_ROWS * M_CARD_H + (M_MAIN_ROWS - 1) * RGAP;  // 75 mm

// ── Monthly-report: challenge subsection (4 × 1 = 4 hard objects) ────────────
const CHAL_MAX       = 4;
const CHAL_GAP       = 3;                             // gap between main grid and challenge
const CHAL_TITLE_H   = 7;                             // challenge header bar height
const CHAL_CARD_H    = 27;                            // mm per challenge card
const CHAL_IMG_H     = 14;                            // mm image height (challenge)
const CHAL_START     = GRID_START + M_MAIN_GRID_H + CHAL_GAP;      // ≈ 109 mm
const CHAL_CARDS_Y   = CHAL_START + CHAL_TITLE_H;                   // ≈ 116 mm

// ── Monthly-report: events strip ──────────────────────────────────────────────
const EVT_GAP      = 3;                               // mm gap before events
const EVT_Y        = CHAL_CARDS_Y + CHAL_CARD_H + EVT_GAP;          // ≈ 146 mm
const EVT_H        = PH - EVT_Y - PM;                                // ≈ 54 mm
const EVT_COL_GAP  = 4;
const EVT_COL_W    = (CW - EVT_COL_GAP * 2) / 3;                   // ≈ 89.7 mm

// ── Themes ────────────────────────────────────────────────────────────────────
type RGB = [number, number, number];
interface Theme {
  bg: RGB; card: RGB; surface: RGB;
  primary: RGB; text: RGB; textMuted: RGB;
  border: RGB; success: RGB; warning: RGB; error: RGB;
}

const COLOR_THEME: Theme = {
  bg:       [7,   7,  13],
  card:     [18,  18, 32],
  surface:  [26,  26, 46],
  primary:  [232, 114, 12],
  text:     [224, 224, 240],
  textMuted:[125, 125, 158],
  border:   [36,  36,  60],
  success:  [74, 222, 128],
  warning:  [251, 191,  36],
  error:    [248, 113, 113],
};

const BW_THEME: Theme = {
  bg:       [255, 255, 255],
  card:     [246, 246, 250],
  surface:  [232, 232, 240],
  primary:  [20,   20,  20],
  text:     [10,   10,  10],
  textMuted:[100, 100, 110],
  border:   [185, 185, 200],
  success:  [28,  140,  60],
  warning:  [150, 100,   0],
  error:    [175,  25,  25],
};

const TYPE_LABEL: Record<string, string> = {
  galaxy:          'Galaxy',
  nebula:          'Nebula',
  cluster:         'Cluster',
  globular:        'Globular',
  planetaryNebula: 'Plan. Neb.',
  doubleCluster:   'Dbl. Cluster',
  supernovaRemnant:'SNR',
  asterism:        'Asterism',
  other:           'DSO',
};

// ── Meteor shower static data ─────────────────────────────────────────────────
const METEOR_SHOWERS: Array<{
  name: string; month: number; day: number; zhr: number; radiant: string;
}> = [
  { name: 'Quadrantids',    month: 1,  day: 3,  zhr: 110, radiant: 'Boötes'     },
  { name: 'Lyrids',         month: 4,  day: 22, zhr: 18,  radiant: 'Lyra'       },
  { name: 'Eta Aquarids',   month: 5,  day: 6,  zhr: 50,  radiant: 'Aquarius'   },
  { name: 'Delta Aquarids', month: 7,  day: 28, zhr: 20,  radiant: 'Aquarius'   },
  { name: 'Perseids',       month: 8,  day: 12, zhr: 100, radiant: 'Perseus'    },
  { name: 'Draconids',      month: 10, day: 8,  zhr: 10,  radiant: 'Draco'      },
  { name: 'Orionids',       month: 10, day: 21, zhr: 20,  radiant: 'Orion'      },
  { name: 'Leonids',        month: 11, day: 17, zhr: 15,  radiant: 'Leo'        },
  { name: 'Geminids',       month: 12, day: 14, zhr: 120, radiant: 'Gemini'     },
  { name: 'Ursids',         month: 12, day: 22, zhr: 10,  radiant: 'Ursa Minor' },
];

// Full moon traditional names (northern hemisphere)
const FULL_MOON_NAMES: Record<number, string> = {
  1: 'Wolf Moon', 2: 'Snow Moon', 3: 'Worm Moon', 4: 'Pink Moon',
  5: 'Flower Moon', 6: 'Strawberry Moon', 7: 'Buck Moon', 8: 'Sturgeon Moon',
  9: 'Harvest Moon', 10: "Hunter's Moon", 11: 'Beaver Moon', 12: 'Cold Moon',
};

// Short month names for event display
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function shortDate(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// ── Custom scope detection ────────────────────────────────────────────────────
function hasCustomScope(settings: Settings): boolean {
  const { telescope: t, camera: c } = settings;
  return (
    t.focalLength   !== DEFAULT_TELESCOPE.focalLength   ||
    t.aperture      !== DEFAULT_TELESCOPE.aperture      ||
    t.reducerFactor !== DEFAULT_TELESCOPE.reducerFactor ||
    c.sensorWidth   !== DEFAULT_CAMERA.sensorWidth      ||
    c.sensorHeight  !== DEFAULT_CAMERA.sensorHeight
  );
}

// ── Centre-crop Wikipedia image to card aspect ratio ─────────────────────────
async function fetchCardImage(
  url: string,
  targetW: number = CARD_W,
  targetH: number = IMG_H
): Promise<string | null> {
  try {
    const dataUrl = await imageUrlToDataUrl(url);
    if (!dataUrl) return null;

    return new Promise<string | null>(resolve => {
      const img = new Image();
      img.onload = () => {
        const targetAspect = targetW / targetH;
        const imgAspect    = img.naturalWidth / img.naturalHeight;
        let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
        if (imgAspect > targetAspect) {
          sw = Math.round(img.naturalHeight * targetAspect);
          sx = Math.round((img.naturalWidth  - sw) / 2);
        } else {
          sh = Math.round(img.naturalWidth  / targetAspect);
          sy = Math.round((img.naturalHeight - sh) / 2);
        }
        const cvs = document.createElement('canvas');
        cvs.width  = Math.round(targetW * 12);
        cvs.height = Math.round(targetH * 12);
        const ctx = cvs.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cvs.width, cvs.height);
        resolve(cvs.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch {
    return null;
  }
}

// ── Fetch HiPS2FITS sky cutout as data URL for PDF ───────────────────────────
async function fetchFOVCardImage(
  target: DeepSkyTarget,
  settings: Settings,
  cardW: number = CARD_W,
  cardH: number = IMG_H
): Promise<string | null> {
  try {
    const fov   = computeFOV(settings.telescope, settings.camera);
    const raDeg = target.ra * 15;
    const reqW  = Math.round(cardW * 12);
    const reqH  = Math.round(cardH * 12);

    const params = new URLSearchParams({
      hips: 'CDS/P/DSS2/color', width: String(reqW), height: String(reqH),
      fov: String(fov.fovWidthDeg), projection: 'TAN', coordsys: 'icrs',
      ra: String(raDeg), dec: String(target.dec), format: 'jpg',
    });

    const res = await fetch(
      `https://alasky.u-strasbg.fr/hips-image-services/hips2fits?${params}`
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;

    return new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Moon phases within a calendar month ──────────────────────────────────────
function getMonthMoonPhases(
  year: number, month: number
): Array<{ date: Date; name: string; emoji: string; subName?: string }> {
  const phases = [
    { deg: 0,   name: 'New Moon',     emoji: '🌑' },
    { deg: 90,  name: '1st Quarter',  emoji: '🌓' },
    { deg: 180, name: 'Full Moon',    emoji: '🌕' },
    { deg: 270, name: 'Last Quarter', emoji: '🌗' },
  ];

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0, 23, 59, 59);
  const results: Array<{ date: Date; name: string; emoji: string; subName?: string }> = [];

  for (const { deg, name, emoji } of phases) {
    // Search from 20 days before month start so we catch any phase near the 1st
    let searchFrom = new Date(year, month - 1, -19);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = Astronomy.SearchMoonPhase(deg, searchFrom, 40);
        if (!r) break;
        if (r.date >= monthStart && r.date <= monthEnd) {
          const entry: { date: Date; name: string; emoji: string; subName?: string } = {
            date: r.date, name, emoji,
          };
          if (deg === 180) entry.subName = FULL_MOON_NAMES[month];
          results.push(entry);
        }
        // Jump ahead 25 days to search for a second occurrence in the same month
        searchFrom = new Date(r.date.getTime() + 25 * 86_400_000);
      } catch { break; }
    }
  }

  return results.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── Planetary / seasonal events within a calendar month ──────────────────────
function getMonthPlanetaryEvents(
  year: number, month: number
): Array<{ date: Date; desc: string }> {
  const events: Array<{ date: Date; desc: string }> = [];
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd   = new Date(year, month, 0, 23, 59, 59);

  // Equinoxes & solstices
  try {
    const s = Astronomy.Seasons(year);
    const seasonList = [
      { time: s.mar_equinox,  desc: 'Vernal Equinox (Spring begins)' },
      { time: s.jun_solstice, desc: 'Summer Solstice (longest day)' },
      { time: s.sep_equinox,  desc: 'Autumnal Equinox (Autumn begins)' },
      { time: s.dec_solstice, desc: 'Winter Solstice (shortest day)' },
    ];
    for (const { time, desc } of seasonList) {
      if (time.date >= monthStart && time.date <= monthEnd) {
        events.push({ date: time.date, desc });
      }
    }
  } catch { /* ignore */ }

  // Mercury & Venus: max elongation
  for (const [body, name] of [
    [Astronomy.Body.Mercury, 'Mercury'],
    [Astronomy.Body.Venus,   'Venus'],
  ] as const) {
    try {
      const searchFrom = new Date(monthStart.getTime() - 10 * 86_400_000);
      const r = Astronomy.SearchMaxElongation(body, searchFrom);
      if (r && r.time.date >= monthStart && r.time.date <= monthEnd) {
        const dir = r.visibility === 'evening' ? 'Evening Star' : 'Morning Star';
        events.push({
          date: r.time.date,
          desc: `${name}: max elongation ${r.elongation.toFixed(0)}° (${dir})`,
        });
      }
    } catch { /* ignore */ }
  }

  // Outer planets: opposition (relative longitude = 0)
  const outerPlanets = [
    [Astronomy.Body.Mars,    'Mars'   ],
    [Astronomy.Body.Jupiter, 'Jupiter'],
    [Astronomy.Body.Saturn,  'Saturn' ],
    [Astronomy.Body.Uranus,  'Uranus' ],
    [Astronomy.Body.Neptune, 'Neptune'],
  ] as const;

  for (const [body, name] of outerPlanets) {
    try {
      const searchFrom = new Date(monthStart.getTime() - 10 * 86_400_000);
      const r = Astronomy.SearchRelativeLongitude(body, 0, searchFrom);
      if (r && r.date >= monthStart && r.date <= monthEnd) {
        events.push({ date: r.date, desc: `${name} at Opposition — prime viewing!` });
      }
    } catch { /* ignore */ }
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── Aggregate top targets across the whole month ──────────────────────────────
const CLUSTER_TYPES = new Set(['cluster', 'globular', 'doubleCluster', 'asterism']);

async function getMonthlyTargets(
  lat: number, lon: number,
  year: number, month: number,
  settings: Settings,
): Promise<{ main: RankedTarget[]; challenge: RankedTarget[] }> {
  const daysInMonth = new Date(year, month, 0).getDate();
  // Sample every ~4 days for speed (~8 samples)
  const sampleDays: number[] = [];
  for (let d = 1; d <= daysInMonth; d += 4) sampleDays.push(d);

  // Map: targetId → { totalScore, count, bestRanked }
  const scoreMap = new Map<string, {
    totalScore: number; count: number; best: RankedTarget;
  }>();

  for (const day of sampleDays) {
    const date = new Date(year, month - 1, day, 12, 0, 0);
    let nw: NightWindow;
    try {
      nw = computeNightWindow(lat, lon, date);
    } catch {
      const base = new Date(date); base.setHours(21, 0, 0, 0);
      const end  = new Date(date); end.setHours(29, 0, 0, 0);
      nw = { start: base, end: end, moonPhase: 0, moonIllumination: 0 };
    }

    const ranked = rankTargetsForTonight(
      lat, lon, nw, settings.minAltitudeDeg, settings.beginnerMode
    );

    for (const rt of ranked) {
      const existing = scoreMap.get(rt.target.id);
      if (existing) {
        existing.totalScore += rt.score;
        existing.count++;
        if (rt.score > existing.best.score) existing.best = rt;
      } else {
        scoreMap.set(rt.target.id, { totalScore: rt.score, count: 1, best: rt });
      }
    }
  }

  // Sort all by average score
  const sorted = [...scoreMap.values()]
    .sort((a, b) => (b.totalScore / b.count) - (a.totalScore / a.count))
    .map(({ best }) => best);

  // Top 8 go to main grid
  const main = sorted.slice(0, M_MAIN_MAX);
  const mainIds = new Set(main.map(rt => rt.target.id));

  // Challenge: hard difficulty, not a star cluster type, not already in main
  const challenge = sorted
    .filter(rt =>
      !mainIds.has(rt.target.id) &&
      rt.target.difficulty === 'hard' &&
      !CLUSTER_TYPES.has(rt.target.type)
    )
    .slice(0, CHAL_MAX);

  return { main, challenge };
}

// ── Upcoming meteor showers (next N months from given year/month) ──────────────
function getUpcomingShowers(
  year: number, month: number, numMonths: number
): Array<{ name: string; month: number; day: number; zhr: number; radiant: string; year: number }> {
  const today = new Date(year, month - 1, 1);
  const results: Array<{ name: string; month: number; day: number; zhr: number; radiant: string; year: number }> = [];

  for (let i = 0; i < numMonths; i++) {
    const m = ((month - 1 + i) % 12) + 1;
    const y = year + Math.floor((month - 1 + i) / 12);
    for (const shower of METEOR_SHOWERS) {
      if (shower.month === m) {
        const peakDate = new Date(y, m - 1, shower.day);
        if (peakDate >= today) {
          results.push({ ...shower, year: y });
        }
      }
    }
  }

  results.sort((a, b) => {
    const da = new Date(a.year, a.month - 1, a.day);
    const db = new Date(b.year, b.month - 1, b.day);
    return da.getTime() - db.getTime();
  });

  return results;
}

// ── Upcoming planetary / seasonal events (next 6 months, capped at maxCount) ──
function getUpcomingPlanetaryEvents(
  year: number, month: number, maxCount: number
): Array<{ date: Date; desc: string }> {
  const startDate = new Date(year, month - 1, 1);
  const events: Array<{ date: Date; desc: string }> = [];

  for (let i = 0; i < 6; i++) {
    const m = ((month - 1 + i) % 12) + 1;
    const y = year + Math.floor((month - 1 + i) / 12);
    for (const ev of getMonthPlanetaryEvents(y, m)) {
      if (ev.date >= startDate) events.push(ev);
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events.slice(0, maxCount);
}

// ── Page header ───────────────────────────────────────────────────────────────
function drawHeader(
  doc: jsPDF, theme: Theme,
  location: Location, nw: NightWindow,
  dayLabel: string, settings: Settings, count: number
) {
  doc.setFillColor(...theme.primary);
  doc.rect(0, 0, PW, HDR_BAR, 'F');
  doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('WHAT CAN I SEE TONIGHT?  —  SKY REPORT', PM, 5.6);
  doc.text('wcist.app', PW - PM, 5.6, { align: 'right' });

  doc.setFillColor(...theme.surface);
  doc.rect(0, HDR_BAR, PW, HDR_INFO, 'F');

  const statW  = CW / 4;
  const labelY = HDR_BAR + 5.5;
  const valueY = HDR_BAR + 13.5;
  const dur    = ((nw.end.getTime() - nw.start.getTime()) / 3_600_000).toFixed(1);

  const stats = [
    { l: 'LOCATION', v: location.cityName.substring(0, 28) },
    { l: 'DATE',     v: dayLabel },
    { l: 'WINDOW',   v: `${formatTime(nw.start)} – ${formatTime(nw.end)}  (${dur} h)` },
    { l: 'MOON',     v: `${getMoonEmoji(nw.moonPhase)} ${getMoonPhaseName(nw.moonPhase)}  ·  ${nw.moonIllumination}%` },
  ];

  stats.forEach(({ l, v }, i) => {
    const x = PM + i * statW;
    if (i > 0) {
      doc.setDrawColor(...theme.border);
      doc.setLineWidth(0.2);
      doc.line(x, HDR_BAR + 3, x, HDR_BAR + HDR_INFO - 3);
    }
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.textMuted);
    doc.text(l, x + 3, labelY);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.text);
    doc.text(doc.splitTextToSize(v, statW - 6)[0] ?? '', x + 3, valueY);
  });

  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.primary);
  doc.text(
    `${count} objects  ·  min alt ${settings.minAltitudeDeg}°` +
    (settings.beginnerMode ? '  ·  Beginner mode' : ''),
    PW - PM, HDR_BAR + HDR_INFO - 4, { align: 'right' }
  );

  doc.setDrawColor(...theme.border);
  doc.setLineWidth(0.4);
  doc.line(0, HDR_H, PW, HDR_H);
}

// ── Card grid (shared by both tonight and monthly reports) ────────────────────
function drawCardGrid(
  doc: jsPDF, theme: Theme,
  targets: RankedTarget[],
  images: Array<string | null>,
  opts: {
    gridStart?: number;
    cardW?: number; cardH?: number; imgH?: number; infoH?: number;
  } = {}
) {
  const gStart = opts.gridStart ?? GRID_START;
  const cW     = opts.cardW    ?? CARD_W;
  const cH     = opts.cardH    ?? CARD_H;
  const iH     = opts.imgH     ?? IMG_H;

  const limited = targets.slice(0, MAX_TARGETS);

  for (let i = 0; i < limited.length; i++) {
    const col   = i % COLS;
    const row   = Math.floor(i / COLS);
    const cardX = PM + col * (cW + CGAP);
    const cardY = gStart + row * (cH + RGAP);

    const { target, maxAltitude, bestTime } = limited[i];
    const imgData = images[i];

    doc.setFillColor(...theme.card);
    doc.roundedRect(cardX, cardY, cW, cH, 1.5, 1.5, 'F');

    if (imgData) {
      doc.addImage(imgData, 'JPEG', cardX, cardY, cW, iH);
    } else {
      doc.setFillColor(...theme.surface);
      doc.rect(cardX, cardY, cW, iH, 'F');
      doc.setFontSize(18); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...theme.textMuted);
      doc.text('✦', cardX + cW / 2, cardY + iH / 2 + 3.5, { align: 'center' });
    }

    doc.setFillColor(...theme.card);
    doc.rect(cardX, cardY + iH, cW, cH - iH + 0.5, 'F');

    // Rank badge
    const bX = cardX + 4.5;
    const bY = cardY + 4.5;
    doc.setFillColor(...(i < 3 ? theme.primary : [8, 8, 16] as RGB));
    doc.circle(bX, bY, 3.5, 'F');
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), bX, bY + 1.2, { align: 'center' });

    // Type pill
    const typeStr = TYPE_LABEL[target.type] ?? target.type;
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
    const tW = doc.getTextWidth(typeStr) + 4;
    const tX = cardX + cW - tW - 2;
    const tY = cardY + 2;
    doc.setFillColor(0, 0, 0);
    doc.rect(tX, tY, tW, 5.5, 'F');
    doc.setTextColor(...theme.primary);
    doc.text(typeStr, tX + 2, tY + 3.8);

    // Text area
    const ix = cardX + 2.5;
    const iW = cW - 5;
    let ty   = cardY + iH + 3.5;

    // Row 1: ID + name
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.text);
    doc.text(target.id, ix, ty);
    const idW = doc.getTextWidth(target.id) + 2;
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.textMuted);
    doc.text(doc.splitTextToSize(target.name, iW - idW)[0] ?? '', ix + idW, ty);
    ty += 5;

    // Row 2: constellation + difficulty
    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.textMuted);
    doc.text(target.constellation, ix, ty);
    const diffColor: Record<string, RGB> = {
      easy: theme.success, medium: theme.warning, hard: theme.error,
    };
    doc.setFontSize(6); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(diffColor[target.difficulty] ?? theme.textMuted));
    doc.text(target.difficulty.toUpperCase(), cardX + cW - 2.5, ty, { align: 'right' });
    ty += 4;

    // Row 3: altitude + best time + magnitude
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.primary);
    const altTxt = `${maxAltitude.toFixed(0)}°`;
    doc.text(altTxt, ix, ty);
    const altW = doc.getTextWidth(altTxt) + 2;
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.text);
    const timeTxt = formatTime(bestTime);
    doc.text(timeTxt, ix + altW, ty);
    const timeW = altW + doc.getTextWidth(timeTxt) + 2;
    doc.setFontSize(6.5); doc.setTextColor(...theme.textMuted);
    const magTxt = `★ ${target.magnitude}`;
    doc.text(magTxt, ix + timeW, ty);
    if (target.sizeArcMin) {
      const magW = timeW + doc.getTextWidth(magTxt) + 2;
      doc.setFontSize(6);
      doc.text(`⌀ ${target.sizeArcMin}'`, ix + magW, ty);
    }
    ty += 4;

    // Row 4: how-to-spot (italic, fill remaining space)
    const remaining = cardY + cH - ty - 1.5;
    if (remaining >= 3) {
      doc.setFontSize(5.8); doc.setFont('helvetica', 'italic');
      doc.setTextColor(...theme.textMuted);
      const howLines = doc.splitTextToSize(target.howToSpot, iW);
      const maxLines = Math.max(1, Math.floor(remaining / 3.2));
      doc.text(howLines.slice(0, maxLines), ix, ty);
    }

    // Card border
    doc.setDrawColor(...theme.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(cardX, cardY, cW, cH, 1.5, 1.5, 'S');
    doc.setLineWidth(0.3);
    doc.line(cardX, cardY + iH, cardX + cW, cardY + iH);
  }
}

// ── Challenge Yourself subsection (monthly report only) ───────────────────────
function drawChallengeSection(
  doc: jsPDF, theme: Theme,
  targets: RankedTarget[],
  images: Array<string | null>
) {
  if (targets.length === 0) return;

  // ── Title bar ───────────────────────────────────────────────────────────────
  doc.setFillColor(...theme.surface);
  doc.rect(PM, CHAL_START, CW, CHAL_TITLE_H, 'F');

  // Red left accent stripe
  doc.setFillColor(...theme.error);
  doc.rect(PM, CHAL_START, 3, CHAL_TITLE_H, 'F');

  doc.setFontSize(6.8); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.error);
  doc.text('CHALLENGE YOURSELF', PM + 6, CHAL_START + 4.8);

  doc.setFontSize(6); doc.setFont('helvetica', 'normal');
  doc.setTextColor(...theme.textMuted);
  doc.text('Difficult objects for experienced imagers — not for the faint-hearted!', PM + 57, CHAL_START + 4.8);

  // ── Cards ───────────────────────────────────────────────────────────────────
  const cW = CARD_W;  // same column width as main grid

  for (let i = 0; i < Math.min(targets.length, CHAL_MAX); i++) {
    const cardX = PM + i * (cW + CGAP);
    const cardY = CHAL_CARDS_Y;
    const { target, maxAltitude, bestTime } = targets[i];
    const imgData = images[i];

    // Card background
    doc.setFillColor(...theme.card);
    doc.roundedRect(cardX, cardY, cW, CHAL_CARD_H, 1.5, 1.5, 'F');

    // Image / placeholder
    if (imgData) {
      doc.addImage(imgData, 'JPEG', cardX, cardY, cW, CHAL_IMG_H);
    } else {
      doc.setFillColor(...theme.surface);
      doc.rect(cardX, cardY, cW, CHAL_IMG_H, 'F');
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.setTextColor(...theme.textMuted);
      doc.text('✦', cardX + cW / 2, cardY + CHAL_IMG_H / 2 + 2, { align: 'center' });
    }

    // HARD badge (top-left)
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
    const hLabel = 'HARD';
    const hW = doc.getTextWidth(hLabel) + 4;
    doc.setFillColor(...theme.error);
    doc.rect(cardX + 2, cardY + 2, hW, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(hLabel, cardX + 4, cardY + 5.5);

    // Type pill (top-right)
    const typeStr = TYPE_LABEL[target.type] ?? target.type;
    doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
    const tW = doc.getTextWidth(typeStr) + 4;
    const tX = cardX + cW - tW - 2;
    doc.setFillColor(0, 0, 0);
    doc.rect(tX, cardY + 2, tW, 5, 'F');
    doc.setTextColor(...theme.primary);
    doc.text(typeStr, tX + 2, cardY + 5.5);

    // Info fill
    doc.setFillColor(...theme.card);
    doc.rect(cardX, cardY + CHAL_IMG_H, cW, CHAL_CARD_H - CHAL_IMG_H + 0.5, 'F');

    const ix = cardX + 2.5;
    const iW = cW - 5;
    let ty = cardY + CHAL_IMG_H + 3.5;

    // Row 1: ID + name
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.text);
    doc.text(target.id, ix, ty);
    const idW = doc.getTextWidth(target.id) + 2;
    doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.textMuted);
    doc.text(doc.splitTextToSize(target.name, iW - idW)[0] ?? '', ix + idW, ty);
    ty += 4.5;

    // Row 2: constellation · altitude · best time
    doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.textMuted);
    doc.text(target.constellation, ix, ty);

    doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.primary);
    const altTxt = `${maxAltitude.toFixed(0)}°`;
    doc.text(altTxt, cardX + cW / 2, ty, { align: 'center' });

    doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.text);
    doc.text(formatTime(bestTime), cardX + cW - 2.5, ty, { align: 'right' });

    // Card border + image separator
    doc.setDrawColor(...theme.border);
    doc.setLineWidth(0.2);
    doc.roundedRect(cardX, cardY, cW, CHAL_CARD_H, 1.5, 1.5, 'S');
    doc.setLineWidth(0.3);
    doc.line(cardX, cardY + CHAL_IMG_H, cardX + cW, cardY + CHAL_IMG_H);
  }
}

// ── Monthly events section ────────────────────────────────────────────────────
function drawEventsSection(
  doc:        jsPDF,
  theme:      Theme,
  moonPhases: Array<{ date: Date; name: string; emoji: string; subName?: string }>,
  upcomingShowers:   Array<{ name: string; month: number; day: number; zhr: number; radiant: string; year: number }>,
  upcomingPlanetary: Array<{ date: Date; desc: string }>,
  monthLabel: string   // e.g. "February 2026"
) {
  // Background strip
  doc.setFillColor(...theme.surface);
  doc.rect(PM, EVT_Y, CW, EVT_H, 'F');

  // Accent top border
  doc.setDrawColor(...theme.primary);
  doc.setLineWidth(0.6);
  doc.line(PM, EVT_Y, PM + CW, EVT_Y);

  // Section title
  const titleY = EVT_Y + 5.5;
  doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...theme.primary);
  doc.text(`KEY EVENTS  —  ${monthLabel.toUpperCase()} & UPCOMING`, PM + 3, titleY);

  // Separator under title
  doc.setDrawColor(...theme.border);
  doc.setLineWidth(0.2);
  doc.line(PM, EVT_Y + 8, PM + CW, EVT_Y + 8);

  const colTop  = EVT_Y + 10;   // top of column content
  const LINE_H  = 7.8;          // height per event entry

  // ── Column helpers ──────────────────────────────────────────────────────────
  function colTitle(x: number, label: string) {
    doc.setFontSize(5.8); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...theme.textMuted);
    doc.text(label, x, colTop);
  }

  function colEntry(
    x: number, y: number,
    line1: string, line2: string,
    accentColor?: RGB
  ) {
    doc.setFontSize(7.2); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(accentColor ?? theme.text));
    doc.text(line1, x, y);
    doc.setFontSize(6); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.textMuted);
    doc.text(line2, x, y + 4);
  }

  // ── Column 1: Moon Phases (current month) ───────────────────────────────────
  const col1X = PM + 3;
  colTitle(col1X, '🌙  MOON PHASES');
  let y1 = colTop + 6;

  if (moonPhases.length === 0) {
    doc.setFontSize(6.5); doc.setFont('helvetica', 'italic');
    doc.setTextColor(...theme.textMuted);
    doc.text('No data available', col1X, y1);
  } else {
    for (const p of moonPhases) {
      if (y1 + LINE_H > EVT_Y + EVT_H - 2) break;
      const line1 = `${p.emoji}  ${p.name}`;
      const line2 = p.subName
        ? `${shortDate(p.date)}  ·  ${p.subName}`
        : shortDate(p.date);

      const accent: RGB | undefined =
        p.name === 'Full Moon' ? theme.warning :
        p.name === 'New Moon'  ? [100, 100, 140] as RGB :
        undefined;

      colEntry(col1X, y1, line1, line2, accent);
      y1 += LINE_H;
    }
  }

  // Column separator
  const sep1X = PM + EVT_COL_W + EVT_COL_GAP / 2;
  doc.setDrawColor(...theme.border);
  doc.setLineWidth(0.15);
  doc.line(sep1X, EVT_Y + 9, sep1X, EVT_Y + EVT_H - 2);

  // ── Column 2: Upcoming Meteor Showers (next 6 months) ──────────────────────
  const col2X = PM + EVT_COL_W + EVT_COL_GAP + 3;
  colTitle(col2X, '☄️  UPCOMING METEOR SHOWERS');
  let y2 = colTop + 6;

  if (upcomingShowers.length === 0) {
    doc.setFontSize(6.5); doc.setFont('helvetica', 'italic');
    doc.setTextColor(...theme.textMuted);
    doc.text('No major showers in next 6 months', col2X, y2);
  } else {
    for (const s of upcomingShowers) {
      if (y2 + LINE_H > EVT_Y + EVT_H - 2) break;
      const peakLabel = `${MONTH_SHORT[s.month - 1]} ${s.day}` +
        (s.year !== new Date().getFullYear() ? ` ${s.year}` : '');
      colEntry(
        col2X, y2,
        `⋆  ${s.name}`,
        `Peak ${peakLabel}  ·  ZHR ~${s.zhr}  ·  ${s.radiant}`,
        s.zhr >= 80 ? theme.warning : undefined
      );
      y2 += LINE_H;
    }
  }

  // Column separator
  const sep2X = PM + 2 * (EVT_COL_W + EVT_COL_GAP) - EVT_COL_GAP / 2;
  doc.setLineWidth(0.15);
  doc.setDrawColor(...theme.border);
  doc.line(sep2X, EVT_Y + 9, sep2X, EVT_Y + EVT_H - 2);

  // ── Column 3: Upcoming Sky Highlights (next 6 months, top 5) ───────────────
  const col3X = PM + 2 * (EVT_COL_W + EVT_COL_GAP) + 3;
  colTitle(col3X, '🪐  UPCOMING SKY HIGHLIGHTS');
  let y3 = colTop + 6;

  if (upcomingPlanetary.length === 0) {
    doc.setFontSize(6.5); doc.setFont('helvetica', 'italic');
    doc.setTextColor(...theme.textMuted);
    doc.text('No major planetary events upcoming', col3X, y3);
  } else {
    for (const e of upcomingPlanetary) {
      if (y3 + LINE_H > EVT_Y + EVT_H - 2) break;
      const lines = doc.splitTextToSize(e.desc, EVT_COL_W - 6);
      // Include month in date so multi-month events are clear
      const dateLabel = `${MONTH_SHORT[e.date.getMonth()]} ${e.date.getDate()}`;
      colEntry(
        col3X, y3,
        lines[0] ?? e.desc,
        dateLabel,
        e.desc.includes('Opposition') ? theme.success : undefined
      );
      y3 += LINE_H;
    }
  }
}

// ── Footer ────────────────────────────────────────────────────────────────────
function drawFooter(doc: jsPDF, theme: Theme, note: string) {
  doc.setFontSize(5.5); doc.setFont('helvetica', 'italic');
  doc.setTextColor(...theme.textMuted);
  doc.text(note, PW / 2, PH - 2, { align: 'center' });
}

// ── Public: tonight's report ──────────────────────────────────────────────────
export interface ReportOptions {
  location:    Location;
  nightWindow: NightWindow;
  targets:     RankedTarget[];
  settings:    Settings;
}

export async function generateSkyReport(opts: ReportOptions): Promise<void> {
  const { location, nightWindow, targets, settings } = opts;
  const theme   = settings.reportColor ? COLOR_THEME : BW_THEME;
  const limited = targets.slice(0, MAX_TARGETS);

  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  doc.setFillColor(...theme.bg);
  doc.rect(0, 0, PW, PH, 'F');

  drawHeader(doc, theme, location, nightWindow,
    formatDate(nightWindow.start), settings, limited.length);

  // Always fetch thumbnails (custom scope → FOV images, otherwise wiki)
  const useScope = hasCustomScope(settings);
  const images = await Promise.all(
    limited.map(rt => {
      if (useScope) return fetchFOVCardImage(rt.target, settings).catch(() => null);
      return rt.wikiImageUrl
        ? fetchCardImage(rt.wikiImageUrl).catch(() => null)
        : Promise.resolve(null);
    })
  );

  drawCardGrid(doc, theme, limited, images);

  drawFooter(doc, theme,
    `Generated by "What Can I See Tonight?"  ·  ${new Date().toLocaleString()}` +
    `  ·  Coordinates J2000  ·  Altitudes approximate`
  );

  const safe    = location.cityName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
  const dateStr = nightWindow.start.toISOString().substring(0, 10);
  doc.save(`sky-report-${safe}-${dateStr}.pdf`);
}

// ── Public: monthly sky report ────────────────────────────────────────────────
export interface MonthlyReportOptions {
  location: Location;
  settings: Settings;
  /** Override: which month to report (1-12). Defaults to current month. */
  month?: number;
  /** Override: which year. Defaults to current year. */
  year?: number;
}

export async function generateMonthlyReport(opts: MonthlyReportOptions): Promise<void> {
  const { location, settings } = opts;
  const now   = new Date();
  const year  = opts.year  ?? now.getFullYear();
  const month = opts.month ?? (now.getMonth() + 1);  // 1-based

  const theme = settings.reportColor ? COLOR_THEME : BW_THEME;

  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  // ── Compute top targets for the month (8 main + up to 4 challenge) ─────────
  const { main: mainTargets, challenge: chalTargets } =
    await getMonthlyTargets(location.lat, location.lon, year, month, settings);

  const allMonthlyTargets = [...mainTargets, ...chalTargets];

  // ── Fetch images ───────────────────────────────────────────────────────────
  const useScope = hasCustomScope(settings);

  // Ensure wiki image URLs are available
  if (!useScope) {
    await Promise.all(
      allMonthlyTargets.map(async rt => {
        if (!rt.wikiImageUrl) {
          const url = await fetchWikiImage(rt.target.wikipediaTitle).catch(() => null);
          if (url) rt.wikiImageUrl = url;
        }
      })
    );
  }

  // Fetch main card images (larger)
  const mainImages = await Promise.all(
    mainTargets.map(rt => {
      if (useScope) return fetchFOVCardImage(rt.target, settings, CARD_W, M_IMG_H).catch(() => null);
      return rt.wikiImageUrl
        ? fetchCardImage(rt.wikiImageUrl, CARD_W, M_IMG_H).catch(() => null)
        : Promise.resolve(null);
    })
  );

  // Fetch challenge card images (smaller)
  const chalImages = await Promise.all(
    chalTargets.map(rt => {
      if (useScope) return fetchFOVCardImage(rt.target, settings, CARD_W, CHAL_IMG_H).catch(() => null);
      return rt.wikiImageUrl
        ? fetchCardImage(rt.wikiImageUrl, CARD_W, CHAL_IMG_H).catch(() => null)
        : Promise.resolve(null);
    })
  );

  // ── Compute events ─────────────────────────────────────────────────────────
  const moonPhases       = getMonthMoonPhases(year, month);
  const upcomingShowers  = getUpcomingShowers(year, month, 6);
  const upcomingPlanetary = getUpcomingPlanetaryEvents(year, month, 5);

  // Use mid-month for the header night window
  let midNW: NightWindow;
  try {
    midNW = computeNightWindow(location.lat, location.lon, new Date(year, month - 1, 15));
  } catch {
    const base = new Date(year, month - 1, 15, 21, 0, 0);
    const end  = new Date(year, month - 1, 16, 5,  0, 0);
    midNW = { start: base, end: end, moonPhase: 0, moonIllumination: 0 };
  }

  // ── Render page ────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
  doc.setFillColor(...theme.bg);
  doc.rect(0, 0, PW, PH, 'F');

  const totalShown = mainTargets.length + chalTargets.length;
  drawHeader(doc, theme, location, midNW, monthLabel, settings, totalShown);

  if (mainTargets.length === 0) {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...theme.textMuted);
    doc.text('No targets above minimum altitude this month.', PW / 2, PH / 2, { align: 'center' });
  } else {
    // Draw main 4×2 grid (top 8)
    drawCardGrid(doc, theme, mainTargets, mainImages, {
      gridStart: GRID_START,
      cardW:     CARD_W,
      cardH:     M_CARD_H,
      imgH:      M_IMG_H,
      infoH:     M_INFO_H,
    });

    // Draw challenge subsection
    if (chalTargets.length > 0) {
      drawChallengeSection(doc, theme, chalTargets, chalImages);
    }
  }

  // Draw events strip (upcoming 6 months)
  drawEventsSection(doc, theme, moonPhases, upcomingShowers, upcomingPlanetary, monthLabel);

  drawFooter(doc, theme,
    `Monthly Sky Report  ·  ${location.cityName}  ·  ` +
    `Generated ${new Date().toLocaleString()}  ·  Altitudes approximate  ·  Events for ${monthLabel} & next 6 months`
  );

  const safe = location.cityName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30);
  doc.save(`monthly-sky-report-${safe}-${year}-${String(month).padStart(2, '0')}.pdf`);
}
