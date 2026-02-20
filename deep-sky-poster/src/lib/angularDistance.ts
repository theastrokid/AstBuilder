/**
 * Computes the angular separation (great-circle distance) between two
 * points on the celestial sphere using the haversine formula.
 *
 * @param ra1  Right ascension of point 1, in decimal degrees.
 * @param dec1 Declination of point 1, in decimal degrees.
 * @param ra2  Right ascension of point 2, in decimal degrees.
 * @param dec2 Declination of point 2, in decimal degrees.
 * @returns Angular separation in decimal degrees.
 */
export function angularDistance(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const φ1 = toRad(dec1);
  const φ2 = toRad(dec2);
  const Δφ = toRad(dec2 - dec1);
  const Δλ = toRad(ra2 - ra1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));

  return (c * 180) / Math.PI;
}
