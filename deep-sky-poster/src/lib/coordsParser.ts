/**
 * Parses RA strings from the master catalog.
 *
 * Handles formats such as:
 *   "05h 34m 32s"
 *   "05h 34m 32.1s"
 *   "5 34 32"
 *   "05:34:32.1"
 *
 * Returns RA in decimal degrees (0–360).
 */
export function parseRA(raw: string): number {
  if (!raw || !raw.trim()) return 0;

  // Pattern: optional hours, optional minutes, optional seconds
  // Accepts h/m/s markers, colon separators, or plain spaces
  const match = raw
    .trim()
    .match(/(\d+(?:\.\d+)?)[h:\s]\s*(\d+(?:\.\d+)?)[m:\s]\s*(\d+(?:\.\d+)?)/i);

  if (match) {
    const h = parseFloat(match[1]);
    const m = parseFloat(match[2]);
    const s = parseFloat(match[3]);
    return (h + m / 60 + s / 3600) * 15; // hours → degrees
  }

  // Try bare decimal hours
  const bare = parseFloat(raw);
  if (!isNaN(bare)) return bare * 15;

  return 0;
}

/**
 * Parses Dec strings from the master catalog.
 *
 * Handles formats such as:
 *   "+22° 00′ 52.1″"
 *   "-00° 49′ 23.9″"
 *   "-26° 31′ 31.9″"
 *   "+22 00 52"
 *
 * Returns Dec in decimal degrees (−90 to +90).
 */
export function parseDec(raw: string): number {
  if (!raw || !raw.trim()) return 0;

  const trimmed = raw.trim();
  const sign = trimmed.startsWith('-') ? -1 : 1;

  // Match degrees, arcminutes, arcseconds with various Unicode separators
  const match = trimmed.match(
    /[+-]?\s*(\d+(?:\.\d+)?)\s*[°\s]\s*(\d+(?:\.\d+)?)\s*[′'\s]\s*(\d+(?:\.\d+)?)/u,
  );

  if (match) {
    const d = parseFloat(match[1]);
    const m = parseFloat(match[2]);
    const s = parseFloat(match[3]);
    return sign * (d + m / 60 + s / 3600);
  }

  // Two-part (degrees + arcminutes only)
  const match2 = trimmed.match(/[+-]?\s*(\d+(?:\.\d+)?)\s*[°\s]\s*(\d+(?:\.\d+)?)/u);
  if (match2) {
    const d = parseFloat(match2[1]);
    const m = parseFloat(match2[2]);
    return sign * (d + m / 60);
  }

  // Bare decimal
  const bare = parseFloat(trimmed);
  if (!isNaN(bare)) return bare;

  return 0;
}

/**
 * Returns a human-readable RA string "HHh MMm SSs".
 */
export function raToDisplay(deg: number): string {
  const totalSec = Math.round((deg / 15) * 3600);
  const h = Math.floor(totalSec / 3600) % 24;
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

/**
 * Returns a human-readable Dec string "±DD° MM′ SS″".
 */
export function decToDisplay(deg: number): string {
  const sign = deg < 0 ? '−' : '+';
  const abs = Math.abs(deg);
  const totalSec = Math.round(abs * 3600);
  const d = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${sign}${d.toString().padStart(2, '0')}° ${m.toString().padStart(2, '0')}′ ${s.toString().padStart(2, '0')}″`;
}
