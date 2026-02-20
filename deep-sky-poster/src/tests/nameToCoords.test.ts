import { describe, it, expect } from 'vitest';
import {
  letterToTwoDigits,
  extractLetters,
  buildDigitStream,
  nameToCoords,
  formatCoords,
} from '../lib/nameToCoords';

// ---------------------------------------------------------------------------
// letterToTwoDigits
// ---------------------------------------------------------------------------
describe('letterToTwoDigits', () => {
  it('A → "01"', () => expect(letterToTwoDigits('A')).toBe('01'));
  it('B → "02"', () => expect(letterToTwoDigits('B')).toBe('02'));
  it('M → "13"', () => expect(letterToTwoDigits('M')).toBe('13'));
  it('Y → "25"', () => expect(letterToTwoDigits('Y')).toBe('25'));
  it('Z → "26"', () => expect(letterToTwoDigits('Z')).toBe('26'));
  it('lowercase a → "01"', () => expect(letterToTwoDigits('a')).toBe('01'));
  it('non-alpha → ""', () => expect(letterToTwoDigits('1')).toBe(''));
  it('space → ""', () => expect(letterToTwoDigits(' ')).toBe(''));
});

// ---------------------------------------------------------------------------
// extractLetters
// ---------------------------------------------------------------------------
describe('extractLetters', () => {
  it('strips spaces and ampersands', () =>
    expect(extractLetters('EMI & ELI')).toBe('EMIELI'));
  it('strips numbers and punctuation', () =>
    expect(extractLetters('Jo3hn D.oe')).toBe('JOHNDOE'));
  it('uppercases', () =>
    expect(extractLetters('emi')).toBe('EMI'));
  it('empty input', () =>
    expect(extractLetters('')).toBe(''));
  it('digits only → empty', () =>
    expect(extractLetters('1234')).toBe(''));
});

// ---------------------------------------------------------------------------
// buildDigitStream
// ---------------------------------------------------------------------------
describe('buildDigitStream', () => {
  it('always returns exactly 12 digits', () => {
    expect(buildDigitStream('A').length).toBe(12);
    expect(buildDigitStream('EMIELI').length).toBe(12);
    expect(buildDigitStream('ABCDEFGHIJKLMNOP').length).toBe(12);
  });

  it('EMIELI → 0,5,1,3,0,9,0,5,1,2,0,9 (exact 12 digits)', () => {
    // E=05 M=13 I=09 E=05 L=12 I=09 → 051309051209
    expect(buildDigitStream('EMIELI')).toEqual([0, 5, 1, 3, 0, 9, 0, 5, 1, 2, 0, 9]);
  });

  it('AB → repeats to 12 digits', () => {
    // A=01 B=02 → "0102" repeating → 010201020102
    expect(buildDigitStream('AB')).toEqual([0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2]);
  });

  it('single letter A → A=01 repeated to 12', () => {
    expect(buildDigitStream('A')).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);
  });
});

// ---------------------------------------------------------------------------
// nameToCoords
// ---------------------------------------------------------------------------
describe('nameToCoords', () => {
  it('returns an object with ra, dec, raDecimal, decDecimal', () => {
    const result = nameToCoords('EMIELI');
    expect(result).toHaveProperty('ra');
    expect(result).toHaveProperty('dec');
    expect(result).toHaveProperty('raDecimal');
    expect(result).toHaveProperty('decDecimal');
  });

  it('EMIELI: RA = 05h 13m 09s', () => {
    const { ra } = nameToCoords('EMIELI');
    expect(ra.h).toBe(5);
    expect(ra.m).toBe(13);
    expect(ra.s).toBe(9);
  });

  it('EMIELI: Dec = +05° 12′ 09″ (M=13, odd → "+")', () => {
    const { dec } = nameToCoords('EMIELI');
    expect(dec.sign).toBe('+');
    expect(dec.d).toBe(5);
    expect(dec.m).toBe(12);
    expect(dec.s).toBe(9);
  });

  it('RA wrap: HH is always < 24', () => {
    // Force a case where raw HH would exceed 24
    // 'Y' = 25 → "25"; 'Z' = 26 → "26" → raw HH = 25 → 25%24 = 1
    const r = nameToCoords('YZ');
    expect(r.ra.h).toBeLessThan(24);
  });

  it('MM is always < 60', () => {
    for (const name of ['ZZ', 'AA', 'QQ', 'STUVWX']) {
      const r = nameToCoords(name);
      expect(r.ra.m).toBeLessThan(60);
      expect(r.ra.s).toBeLessThan(60);
      expect(r.dec.m).toBeLessThan(60);
      expect(r.dec.s).toBeLessThan(60);
    }
  });

  it('DD is always < 90', () => {
    for (const name of ['ZZ', 'AA', 'QQ', 'STUVWX']) {
      const r = nameToCoords(name);
      expect(r.dec.d).toBeLessThan(90);
    }
  });

  it('raDecimal is always 0–360', () => {
    for (const name of ['ALICE', 'BOB', 'CHARLIE']) {
      const r = nameToCoords(name);
      expect(r.raDecimal).toBeGreaterThanOrEqual(0);
      expect(r.raDecimal).toBeLessThanOrEqual(360);
    }
  });

  it('decDecimal is always −90 to +90', () => {
    for (const name of ['ALICE', 'BOB', 'CHARLIE']) {
      const r = nameToCoords(name);
      expect(r.decDecimal).toBeGreaterThanOrEqual(-90);
      expect(r.decDecimal).toBeLessThanOrEqual(90);
    }
  });

  it('single-name input works identically to its letters', () => {
    const r1 = nameToCoords('EMI ELI');   // strips space → EMIELI
    const r2 = nameToCoords('EMIELI');
    expect(r1.ra).toEqual(r2.ra);
    expect(r1.dec).toEqual(r2.dec);
  });

  it('digit stream is always 12 digits', () => {
    expect(nameToCoords('A').digitStream.length).toBe(12);
    expect(nameToCoords('EMIELI').digitStream.length).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// formatCoords
// ---------------------------------------------------------------------------
describe('formatCoords', () => {
  it('formats RA and Dec correctly', () => {
    const coords = nameToCoords('EMIELI');
    const { ra, dec } = formatCoords(coords);
    expect(ra).toBe('05, 13, 09');
    expect(dec).toBe('+05, 12, 09');
  });

  it('pads single-digit values with leading zero', () => {
    const coords = nameToCoords('AA'); // A=01 → HH=01 MM=01 SS=01
    const { ra } = formatCoords(coords);
    // Each part should be two digits
    ra.split(', ').forEach((part) => expect(part.length).toBe(2));
  });
});
