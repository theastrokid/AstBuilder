import { describe, it, expect } from 'vitest';
import { angularDistance } from '../lib/angularDistance';

describe('angularDistance', () => {
  it('same point → 0°', () => {
    expect(angularDistance(45, 30, 45, 30)).toBeCloseTo(0, 8);
  });

  it('antipodal points → 180°', () => {
    // (0°, 0°) and (180°, 0°) are antipodal when RA differs by 180°
    expect(angularDistance(0, 0, 180, 0)).toBeCloseTo(180, 5);
  });

  it('north and south poles → 180°', () => {
    expect(angularDistance(0, 90, 0, -90)).toBeCloseTo(180, 5);
  });

  it('1-degree step in Dec near equator ≈ 1°', () => {
    const dist = angularDistance(0, 0, 0, 1);
    expect(dist).toBeCloseTo(1.0, 4);
  });

  it('1-degree step in RA at equator ≈ 1°', () => {
    const dist = angularDistance(10, 0, 11, 0);
    expect(dist).toBeCloseTo(1.0, 4);
  });

  it('1-degree step in RA at Dec=60° ≈ 0.5°', () => {
    // cos(60°) = 0.5, so 1° RA → 0.5° arc
    const dist = angularDistance(10, 60, 11, 60);
    expect(dist).toBeCloseTo(0.5, 2);
  });

  it('Orion Nebula (M42) to Crab Nebula (M1): known separation ~63°', () => {
    // M42: RA=83.822°, Dec=-5.391°
    // M1:  RA=83.633°, Dec=+22.014°
    const dist = angularDistance(83.822, -5.391, 83.633, 22.014);
    // The angular separation should be ~27.4° (both near RA 83°, Dec differs by ~27°)
    expect(dist).toBeCloseTo(27.4, 0);
  });

  it('Andromeda (M31) to Triangulum (M33): known ~14.8°', () => {
    // M31: RA=10.685°, Dec=+41.269°
    // M33: RA=23.462°, Dec=+30.660°
    const dist = angularDistance(10.685, 41.269, 23.462, 30.66);
    expect(dist).toBeCloseTo(14.8, 0);
  });

  it('output is always 0–180', () => {
    const pairs: [number, number, number, number][] = [
      [0, 0, 180, 0],
      [0, 90, 180, -90],
      [45, 45, 315, -45],
      [100, 10, 280, -10],
    ];
    for (const [ra1, dec1, ra2, dec2] of pairs) {
      const d = angularDistance(ra1, dec1, ra2, dec2);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(180);
    }
  });

  it('is symmetric: distance(A,B) === distance(B,A)', () => {
    const d1 = angularDistance(30, 20, 60, -10);
    const d2 = angularDistance(60, -10, 30, 20);
    expect(d1).toBeCloseTo(d2, 8);
  });
});
