import * as Astronomy from "astronomy-engine";
import type { AltSample, DeepSkyTarget, NightWindow, RankedTarget } from '../types';
import { TARGETS } from '../data/targets';

// ── Types ────────────────────────────────────────────────────────────────────
interface AstroObserver {
  lat: number;
  lon: number;
}

// ── Night window calculation ─────────────────────────────────────────────────

/**
 * Compute tonight's observing window (astronomical twilight end → start next morning).
 * Falls back gracefully if twilight search fails (e.g., polar summer).
 */
export function computeNightWindow(lat: number, lon: number, date: Date): NightWindow {
  const observer = new Astronomy.Observer(lat, lon, 0);

  // Start search from local noon on the given date
  const localNoon = new Date(date);
  localNoon.setHours(12, 0, 0, 0);

  let windowStart: Date;
  let windowEnd: Date;

  try {
    // Evening astronomical twilight (-18°) — sun setting below -18°
    const eveningResult = Astronomy.SearchAltitude(
      Astronomy.Body.Sun,
      observer,
      -1,           // direction: setting
      localNoon,
      1,            // search within 1 day
      -18           // altitude threshold
    );

    const morningSearchStart = eveningResult?.date ?? new Date(localNoon.getTime() + 6 * 3600_000);

    // Morning astronomical twilight — sun rising back above -18°
    const morningResult = Astronomy.SearchAltitude(
      Astronomy.Body.Sun,
      observer,
      +1,           // direction: rising
      morningSearchStart,
      1,
      -18
    );

    windowStart = eveningResult?.date ?? new Date(localNoon.getTime() + 5 * 3600_000);
    windowEnd   = morningResult?.date  ?? new Date(localNoon.getTime() + 14 * 3600_000);
  } catch {
    // Fallback: use simple 9 PM – 5 AM window
    windowStart = new Date(localNoon.getTime() + 9 * 3600_000);
    windowEnd   = new Date(localNoon.getTime() + 17 * 3600_000);
  }

  // Moon phase
  const moonAngle = Astronomy.MoonPhase(date);
  const illumination = Math.round((1 - Math.cos((moonAngle * Math.PI) / 180)) / 2 * 100);

  return {
    start: windowStart,
    end: windowEnd,
    moonPhase: moonAngle,
    moonIllumination: illumination,
  };
}

// ── Target altitude calculation ──────────────────────────────────────────────

/** Get altitude of a target at a specific time */
export function getTargetAltitude(
  ra: number,  // decimal hours
  dec: number, // decimal degrees
  observer: Astronomy.Observer,
  time: Date
): number {
  try {
    const hor = Astronomy.Horizon(time, observer, ra, dec, 'normal');
    return hor.altitude;
  } catch {
    return -90;
  }
}

/** Sample altitude every 15 minutes across the night window */
function sampleAltitudes(
  ra: number,
  dec: number,
  observer: Astronomy.Observer,
  windowStart: Date,
  windowEnd: Date
): Array<{ time: Date; altitude: number }> {
  const samples: Array<{ time: Date; altitude: number }> = [];
  const STEP_MS = 15 * 60 * 1000; // 15 minutes

  let t = windowStart.getTime();
  const end = windowEnd.getTime();

  while (t <= end) {
    const time = new Date(t);
    const altitude = getTargetAltitude(ra, dec, observer, time);
    samples.push({ time, altitude });
    t += STEP_MS;
  }

  return samples;
}

// ── Target ranking ───────────────────────────────────────────────────────────

/**
 * Score a target based on multiple factors (0–100 scale).
 * Higher = better tonight.
 */
function scoreTarget(
  target: DeepSkyTarget,
  maxAlt: number,
  beginnerMode: boolean
): number {
  // Altitude score (0–40 pts): reward high-altitude culmination
  const altScore = Math.max(0, Math.min(40, ((maxAlt - 25) / 65) * 40));

  // Magnitude score (0–30 pts): brighter = better. Clamp range 2–14
  const magScore = Math.max(0, Math.min(30, ((14 - target.magnitude) / 12) * 30));

  // Type weighting (0–15 pts): clusters/nebulae favored for beginners
  let typeScore = 5;
  const easyTypes = new Set(['cluster', 'globular', 'doubleCluster', 'asterism']);
  const medTypes  = new Set(['nebula', 'planetaryNebula', 'supernovaRemnant']);
  if (easyTypes.has(target.type)) typeScore = 15;
  else if (medTypes.has(target.type)) typeScore = 10;
  else if (target.type === 'galaxy') typeScore = 7;

  // Difficulty bonus for beginner mode (0–15 pts)
  let diffScore = 5;
  if (beginnerMode) {
    if (target.difficulty === 'easy')   diffScore = 15;
    else if (target.difficulty === 'medium') diffScore = 7;
    else diffScore = 0;
  } else {
    if (target.difficulty === 'easy')   diffScore = 10;
    else if (target.difficulty === 'medium') diffScore = 8;
    else diffScore = 5;
  }

  return altScore + magScore + typeScore + diffScore;
}

/**
 * Rank all targets for tonight. Returns top 20 (or fewer if location has limited sky).
 */
export function rankTargetsForTonight(
  lat: number,
  lon: number,
  nightWindow: NightWindow,
  minAltDeg: number,
  beginnerMode: boolean,
  targets: DeepSkyTarget[] = TARGETS
): RankedTarget[] {
  const observer = new Astronomy.Observer(lat, lon, 0);

  const scored: RankedTarget[] = [];

  for (const target of targets) {
    const samples = sampleAltitudes(
      target.ra,
      target.dec,
      observer,
      nightWindow.start,
      nightWindow.end
    );

    if (!samples.length) continue;

    // Find max altitude and when it occurs
    let maxAlt = -90;
    let bestTimeSample = samples[0];

    for (const s of samples) {
      if (s.altitude > maxAlt) {
        maxAlt = s.altitude;
        bestTimeSample = s;
      }
    }

    // Filter targets that never reach minimum altitude
    if (maxAlt < minAltDeg) continue;

    const score = scoreTarget(target, maxAlt, beginnerMode);

    scored.push({
      target,
      maxAltitude: Math.round(maxAlt * 10) / 10,
      bestTime: bestTimeSample.time,
      score: Math.round(score * 10) / 10,
      altSamples: samples,
    });
  }

  // Sort by score descending, return top 20
  return scored.sort((a, b) => b.score - a.score).slice(0, 20);
}

// ── Moon info ────────────────────────────────────────────────────────────────

export function getMoonPhaseName(angle: number): string {
  const a = ((angle % 360) + 360) % 360;
  if (a < 22.5)  return 'New Moon';
  if (a < 67.5)  return 'Waxing Crescent';
  if (a < 112.5) return 'First Quarter';
  if (a < 157.5) return 'Waxing Gibbous';
  if (a < 202.5) return 'Full Moon';
  if (a < 247.5) return 'Waning Gibbous';
  if (a < 292.5) return 'Last Quarter';
  if (a < 337.5) return 'Waning Crescent';
  return 'New Moon';
}

export function getMoonEmoji(angle: number): string {
  const a = ((angle % 360) + 360) % 360;
  if (a < 22.5)  return '🌑';
  if (a < 67.5)  return '🌒';
  if (a < 112.5) return '🌓';
  if (a < 157.5) return '🌔';
  if (a < 202.5) return '🌕';
  if (a < 247.5) return '🌖';
  if (a < 292.5) return '🌗';
  if (a < 337.5) return '🌘';
  return '🌑';
}

// ── Formatting helpers ───────────────────────────────────────────────────────

export function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatAltitude(alt: number): string {
  return `${alt.toFixed(1)}°`;
}

export function degreesToDMS(deg: number, isRA = false): string {
  const sign = deg < 0 ? '-' : '+';
  const abs = Math.abs(deg);
  if (isRA) {
    const h = Math.floor(abs);
    const m = Math.floor((abs - h) * 60);
    const s = Math.round(((abs - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
  }
  const d = Math.floor(abs);
  const m = Math.floor((abs - d) * 60);
  const s = Math.round(((abs - d) * 60 - m) * 60);
  return `${sign}${d}° ${m}' ${s}"`;
}

// ── Public altitude sample export ─────────────────────────────────────────────

/** Compute altitude samples across a night window for charting.
 *  stepMinutes: sampling resolution (default 10 min for smooth chart). */
export function computeAltitudeSamples(
  ra: number,
  dec: number,
  lat: number,
  lon: number,
  nightStart: Date,
  nightEnd: Date,
  stepMinutes = 10
): AltSample[] {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const samples: AltSample[] = [];
  const stepMs = stepMinutes * 60 * 1000;
  let t = nightStart.getTime();
  const end = nightEnd.getTime();
  while (t <= end) {
    const time = new Date(t);
    let altitude = -90;
    try {
      altitude = Astronomy.Horizon(time, observer, ra, dec, 'normal').altitude;
    } catch { /* leave at -90 */ }
    samples.push({ time, altitude });
    t += stepMs;
  }
  return samples;
}

/** Compute the moon's altitude samples across the night window. */
export function computeMoonAltitudeSamples(
  lat: number,
  lon: number,
  nightStart: Date,
  nightEnd: Date,
  stepMinutes = 10
): AltSample[] {
  const observer = new Astronomy.Observer(lat, lon, 0);
  const samples: AltSample[] = [];
  const stepMs = stepMinutes * 60 * 1000;
  let t = nightStart.getTime();
  const end = nightEnd.getTime();
  while (t <= end) {
    const time = new Date(t);
    let altitude = -90;
    try {
      const moon = Astronomy.Equator(Astronomy.Body.Moon, time, observer, true, true);
      altitude = Astronomy.Horizon(time, observer, moon.ra, moon.dec, 'normal').altitude;
    } catch { /* leave at -90 */ }
    samples.push({ time, altitude });
    t += stepMs;
  }
  return samples;
}
