import { describe, it, expect } from 'vitest';
import { parseRA, parseDec, raToDisplay, decToDisplay } from '../lib/coordsParser';

// ---------------------------------------------------------------------------
// parseRA
// ---------------------------------------------------------------------------
describe('parseRA', () => {
  it('parses "05h 34m 32s"', () => {
    const deg = parseRA('05h 34m 32s');
    // 5h 34m 32s = 5 + 34/60 + 32/3600 = 5.5756 h → × 15 = 83.633°
    expect(deg).toBeCloseTo(83.633, 1);
  });

  it('parses "21h 33m 27s"', () => {
    const deg = parseRA('21h 33m 27s');
    // 21 + 33/60 + 27/3600 = 21.5575h → × 15 = 323.363°
    expect(deg).toBeCloseTo(323.363, 1);
  });

  it('parses decimal seconds "13h 42m 11.2s"', () => {
    const deg = parseRA('13h 42m 11.2s');
    // 13 + 42/60 + 11.2/3600 = 13.7031h → × 15 = 205.547°
    expect(deg).toBeCloseTo(205.547, 1);
  });

  it('returns 0 for empty string', () => {
    expect(parseRA('')).toBe(0);
  });

  it('all results are 0–360', () => {
    const inputs = ['00h 00m 00s', '23h 59m 59s', '12h 00m 00s'];
    inputs.forEach((s) => {
      const r = parseRA(s);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(360);
    });
  });
});

// ---------------------------------------------------------------------------
// parseDec
// ---------------------------------------------------------------------------
describe('parseDec', () => {
  it('parses "+22° 00′ 52.1″"', () => {
    const deg = parseDec('+22° 00′ 52.1″');
    // 22 + 0/60 + 52.1/3600 = 22.01447°
    expect(deg).toBeCloseTo(22.014, 2);
  });

  it('parses "-00° 49′ 23.9″"', () => {
    const deg = parseDec('-00° 49′ 23.9″');
    // -(0 + 49/60 + 23.9/3600) = -0.8233°
    expect(deg).toBeCloseTo(-0.823, 2);
  });

  it('parses "-26° 31′ 31.9″"', () => {
    const deg = parseDec('-26° 31′ 31.9″');
    expect(deg).toBeCloseTo(-26.526, 2);
  });

  it('parses positive declination correctly', () => {
    const deg = parseDec('+28° 22′ 31.6″');
    expect(deg).toBeCloseTo(28.375, 2);
  });

  it('sign: negative ("-") gives negative result', () => {
    expect(parseDec('-10° 00′ 00″')).toBeLessThan(0);
  });

  it('sign: positive ("+") gives positive result', () => {
    expect(parseDec('+10° 00′ 00″')).toBeGreaterThan(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseDec('')).toBe(0);
  });

  it('results are always −90 to +90', () => {
    const inputs = ['+22° 00′ 52.1″', '-00° 49′ 23.9″', '+89° 59′ 59″'];
    inputs.forEach((s) => {
      const r = parseDec(s);
      expect(r).toBeGreaterThanOrEqual(-90);
      expect(r).toBeLessThanOrEqual(90);
    });
  });
});

// ---------------------------------------------------------------------------
// raToDisplay / decToDisplay (round-trip sanity)
// ---------------------------------------------------------------------------
describe('raToDisplay / decToDisplay', () => {
  it('raToDisplay produces HHh MMm SSs format', () => {
    const display = raToDisplay(83.633);
    expect(display).toMatch(/^\d{2}h \d{2}m \d{2}s$/);
  });

  it('decToDisplay produces ±DD° MM′ SS″ format', () => {
    const display = decToDisplay(-26.526);
    expect(display).toMatch(/^[+−]\d{2}°\s\d{2}′\s\d{2}″$/);
    expect(display.startsWith('−')).toBe(true);
  });

  it('decToDisplay positive', () => {
    const display = decToDisplay(22.014);
    expect(display.startsWith('+')).toBe(true);
  });
});
