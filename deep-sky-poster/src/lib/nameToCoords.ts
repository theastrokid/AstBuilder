import type { CoordinatesResult } from '../types';

/**
 * Converts a letter (A-Z) to its 1-based numeric value (A=1…Z=26)
 * and returns it as a zero-padded two-character string.
 */
export function letterToTwoDigits(ch: string): string {
  const upper = ch.toUpperCase();
  if (upper < 'A' || upper > 'Z') return '';
  const val = upper.charCodeAt(0) - 64; // A=1, Z=26
  return val.toString().padStart(2, '0');
}

/**
 * Extracts only alphabetic characters from an input string (ignores
 * spaces, punctuation, '&', digits, etc.) and returns them uppercased.
 */
export function extractLetters(input: string): string {
  return input.replace(/[^A-Za-z]/g, '').toUpperCase();
}

/**
 * Builds an infinite-but-trimmed digit stream from the letter sequence:
 * each letter → two-digit number → two individual digits appended.
 * The stream is then repeated until we have at least 12 digits.
 * Returns exactly 12 digits.
 */
export function buildDigitStream(letters: string): number[] {
  if (!letters.length) return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  const base: number[] = [];
  for (const ch of letters) {
    const twoDigit = letterToTwoDigits(ch);
    base.push(parseInt(twoDigit[0], 10), parseInt(twoDigit[1], 10));
  }

  const stream: number[] = [];
  while (stream.length < 12) {
    stream.push(...base);
  }
  return stream.slice(0, 12);
}

/**
 * Derives physically valid RA/Dec coordinates from an input name string.
 *
 * Algorithm:
 * 1. Strip non-alpha characters; uppercase the letters.
 * 2. Each letter → 2-digit number (A=01…Z=26) → individual digits.
 * 3. Repeat digit stream until 12 digits total.
 * 4. First 6 digits → RA (HH MM SS), next 6 → Dec (DD DM DS).
 * 5. Declination sign: 2nd letter → value (A=1…Z=26), odd="+", even="-".
 * 6. Wrap: HH%24, MM%60, SS%60, DD%90, DM%60, DS%60.
 */
export function nameToCoords(input: string): CoordinatesResult {
  const letters = extractLetters(input);

  // Pad with 'A' if fewer than 2 letters so sign determination is always defined
  const padded = letters.padEnd(2, 'A');

  const secondLetterVal = padded.charCodeAt(1) - 64; // A=1…Z=26
  const decSign: '+' | '-' = secondLetterVal % 2 === 1 ? '+' : '-';

  const digits = buildDigitStream(padded.length > 0 ? letters || 'AA' : 'AA');

  const rawHH = digits[0] * 10 + digits[1];
  const rawMM = digits[2] * 10 + digits[3];
  const rawSS = digits[4] * 10 + digits[5];
  const rawDD = digits[6] * 10 + digits[7];
  const rawDM = digits[8] * 10 + digits[9];
  const rawDS = digits[10] * 10 + digits[11];

  const h = rawHH % 24;
  const m = rawMM % 60;
  const s = rawSS % 60;
  const d = rawDD % 90;
  const dm = rawDM % 60;
  const ds = rawDS % 60;

  const raDecimal = (h + m / 60 + s / 3600) * 15; // degrees
  const decDecimal = (d + dm / 60 + ds / 3600) * (decSign === '+' ? 1 : -1);

  return {
    ra: { h, m, s },
    dec: { sign: decSign, d, m: dm, s: ds },
    raDecimal,
    decDecimal,
    digitStream: digits,
  };
}

/**
 * Formats a CoordinatesResult as display strings.
 * RA:  "HH, MM, SS"
 * Dec: "+DD, DM, DS" or "-DD, DM, DS"
 */
export function formatCoords(coords: CoordinatesResult): { ra: string; dec: string } {
  const { ra, dec } = coords;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return {
    ra: `${pad(ra.h)}, ${pad(ra.m)}, ${pad(ra.s)}`,
    dec: `${dec.sign}${pad(dec.d)}, ${pad(dec.m)}, ${pad(dec.s)}`,
  };
}
