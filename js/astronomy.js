/**
 * astronomy.js — Celestial calculations for Custom Star Map
 *
 * Wraps astronomy-engine for planet/moon computations, and provides
 * direct spherical-trig functions for star alt/az (no external dependency
 * needed for bulk star projection — faster and sufficient for poster use).
 *
 * Accuracy notes:
 * - Star positions: J2000 RA/Dec precessed via GMST formula. Accurate to
 *   ~1 arcmin over ±200 years. Proper motion is ignored (< 0.1° for most
 *   catalog stars over decades).
 * - Planets/Moon: Uses astronomy-engine (sub-arcsecond accuracy).
 * - Sidereal time: IAU formula accurate to < 1 arcsec.
 * - No atmospheric refraction applied (poster map convention).
 */

window.AstroCalc = (function () {

  // ── Julian Date ───────────────────────────────────────────────────
  function julianDate(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  // ── Greenwich Mean Sidereal Time (degrees) ────────────────────────
  // Based on IAU 1982/2006 formula
  function gmst(date) {
    const jd = julianDate(date);
    const T = (jd - 2451545.0) / 36525.0;
    // GMST in degrees at 0h UT
    let g = 280.46061837
      + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * T * T
      - (T * T * T) / 38710000.0;
    return ((g % 360) + 360) % 360;
  }

  // ── Local Sidereal Time (degrees) ─────────────────────────────────
  function lst(date, lon_deg) {
    return ((gmst(date) + lon_deg) % 360 + 360) % 360;
  }

  // ── Precess J2000 RA/Dec to apparent (approx) ─────────────────────
  // Uses IAU precession polynomial (Lieske 1979), good to 0.1" over ±1 century
  function precess(ra_deg, dec_deg, date) {
    const jd = julianDate(date);
    const T = (jd - 2451545.0) / 36525.0; // centuries from J2000
    if (Math.abs(T) < 0.001) return { ra: ra_deg, dec: dec_deg };

    const DEG = Math.PI / 180;
    // Precession angles in arcseconds
    const zeta_A  = (2306.2181 + 1.39656*T - 0.000139*T*T)*T
                    + (0.30188 - 0.000344*T)*T*T + 0.017998*T*T*T;
    const z_A     = (2306.2181 + 1.39656*T - 0.000139*T*T)*T
                    + (1.09468 + 0.000066*T)*T*T + 0.018203*T*T*T;
    const theta_A = (2004.3109 - 0.85330*T - 0.000217*T*T)*T
                    - (0.42665 + 0.000217*T)*T*T - 0.041775*T*T*T;

    const za = zeta_A  / 3600 * DEG;
    const zz = z_A     / 3600 * DEG;
    const th = theta_A / 3600 * DEG;

    const r  = ra_deg * DEG + za;
    const d  = dec_deg * DEG;

    const cosD   = Math.cos(d);
    const sinD   = Math.sin(d);
    const cosR   = Math.cos(r);
    const sinTh  = Math.sin(th);
    const cosTh  = Math.cos(th);

    const A = cosD * Math.sin(r);
    const B = cosTh * cosD * cosR - sinTh * sinD;
    const C = sinTh * cosD * cosR + cosTh * sinD;

    const ra_new  = Math.atan2(A, B) + zz;
    const dec_new = Math.asin(Math.min(1, Math.max(-1, C)));

    return {
      ra:  ((ra_new / DEG) % 360 + 360) % 360,
      dec: dec_new / DEG
    };
  }

  // ── Equatorial → Horizontal ───────────────────────────────────────
  // Returns {alt, az} in degrees
  function equToHoriz(ra_deg, dec_deg, date, lat_deg, lon_deg) {
    const LST = lst(date, lon_deg); // degrees
    const HA  = ((LST - ra_deg) % 360 + 360) % 360; // hour angle in degrees

    const DEG = Math.PI / 180;
    const h  = HA  * DEG;
    const d  = dec_deg * DEG;
    const ph = lat_deg * DEG;

    const sinAlt = Math.sin(d)*Math.sin(ph) + Math.cos(d)*Math.cos(ph)*Math.cos(h);
    const alt    = Math.asin(Math.min(1, Math.max(-1, sinAlt))) / DEG;

    const cosAlt = Math.cos(alt * DEG);
    if (Math.abs(cosAlt) < 1e-9) return { alt, az: 0 };

    const cosAz = (Math.sin(d) - Math.sin(alt * DEG)*Math.sin(ph)) / (cosAlt * Math.cos(ph));
    let az = Math.acos(Math.min(1, Math.max(-1, cosAz))) / DEG;
    if (Math.sin(h) > 0) az = 360 - az;

    return { alt, az };
  }

  // ── Azimuthal Equidistant Projection ──────────────────────────────
  // Maps alt/az to (x,y) in unit circle [-1,1].
  // North is up (az=0 at top), East to the right when facing south.
  function projectAzEq(alt_deg, az_deg, flip) {
    const r = (90 - alt_deg) / 90; // 0 at zenith, 1 at horizon
    const az_rad = az_deg * Math.PI / 180;
    // Standard: North up, East left (as seen looking up at sky)
    const x = flip ? -r * Math.sin(az_rad) : r * Math.sin(az_rad);
    const y = -r * Math.cos(az_rad);
    return { x, y, r };
  }

  // ── Stereographic Projection ───────────────────────────────────────
  function projectStereo(alt_deg, az_deg) {
    const r = 2 * Math.tan((90 - alt_deg) * Math.PI / 360);
    const az_rad = az_deg * Math.PI / 180;
    return { x: r * Math.sin(az_rad), y: -r * Math.cos(az_rad), r };
  }

  // ── Project star to SVG circle coordinates ────────────────────────
  // cx,cy = center; R = radius of sky circle; projection = 'azeq'|'stereo'
  function projectStar(ra_deg, dec_deg, date, lat, lon, cx, cy, R, opts) {
    const precessed = precess(ra_deg, dec_deg, date);
    const horiz = equToHoriz(precessed.ra, precessed.dec, date, lat, lon);

    if (horiz.alt < (opts.minAlt || -2)) return null; // below horizon

    let proj;
    if (opts.projection === 'stereo') {
      proj = projectStereo(horiz.alt, horiz.az);
      // Stereo: normalize so horizon maps to R
      const horizR = 2 * Math.tan(45 * Math.PI / 180); // = 2
      const scale = R / horizR;
      return { x: cx + proj.x * scale, y: cy + proj.y * scale, alt: horiz.alt, az: horiz.az };
    } else {
      proj = projectAzEq(horiz.alt, horiz.az, opts.flip);
      if (proj.r > 1.02) return null;
      return { x: cx + proj.x * R, y: cy + proj.y * R, alt: horiz.alt, az: horiz.az };
    }
  }

  // ── North/South Polar projection ──────────────────────────────────
  // Centers on NCP (or SCP). Used for "north sky" mode.
  // ra_deg, dec_deg are J2000 coordinates.
  function projectPolar(ra_deg, dec_deg, date, lat, lon, cx, cy, R, isSouth) {
    const precessed = precess(ra_deg, dec_deg, date);
    const LST = lst(date, lon);

    const DEG = Math.PI / 180;
    const pole_dec = isSouth ? -90 : 90;
    const ra_r     = precessed.ra * DEG;
    const dec_r    = precessed.dec * DEG;
    const lst_r    = LST * DEG;

    // Angular distance from pole
    const cosDist = Math.sin(dec_r) * (isSouth ? -1 : 1);
    // Angular sep = 90 - dec (from NCP) or 90 + dec (from SCP)
    const angDist = isSouth ? (90 + precessed.dec) : (90 - precessed.dec);
    if (angDist > 95) return null; // behind sky

    // Position angle (N through E for NCP map)
    const ha_r  = lst_r - ra_r;
    const ha_deg = ((ha_r / DEG) % 360 + 360) % 360;
    const angle  = isSouth ? -ha_deg : ha_deg;

    const r = angDist / 90;
    if (r > 1.05) return null;

    const x = cx + r * Math.sin(angle * DEG) * R;
    const y = cy - r * Math.cos(angle * DEG) * R;

    return { x, y, alt: null, az: null };
  }

  // ── Moon Phase ────────────────────────────────────────────────────
  function moonPhase(date) {
    if (typeof Astronomy === 'undefined') return fallbackMoonPhase(date);
    try {
      const illum = Astronomy.Illumination('Moon', date);
      const phase = illum.phase_angle; // 0=new,180=full
      const fraction = illum.phase_fraction;
      return { fraction: Math.round(fraction * 100), phase_angle: phase, name: moonPhaseName(phase) };
    } catch (e) {
      return fallbackMoonPhase(date);
    }
  }

  function fallbackMoonPhase(date) {
    // Simple formula: ~29.53-day cycle from known new moon
    const knownNew = new Date('2000-01-06T18:14:00Z').getTime();
    const synodic  = 29.53058867 * 86400000;
    const elapsed  = (date.getTime() - knownNew) % synodic;
    const phase    = ((elapsed / synodic) * 360 + 360) % 360; // 0=new
    const fraction = (1 - Math.cos(phase * Math.PI / 180)) / 2;
    return { fraction: Math.round(fraction * 100), phase_angle: phase, name: moonPhaseName(phase) };
  }

  function moonPhaseName(phase_angle) {
    const p = phase_angle;
    if (p < 22.5)  return 'New Moon';
    if (p < 67.5)  return 'Waxing Crescent';
    if (p < 112.5) return 'First Quarter';
    if (p < 157.5) return 'Waxing Gibbous';
    if (p < 202.5) return 'Full Moon';
    if (p < 247.5) return 'Waning Gibbous';
    if (p < 292.5) return 'Last Quarter';
    if (p < 337.5) return 'Waning Crescent';
    return 'New Moon';
  }

  // ── Moon Position (Az/Alt) ────────────────────────────────────────
  function moonPosition(date, lat, lon) {
    if (typeof Astronomy === 'undefined') return null;
    try {
      const obs  = new Astronomy.Observer(lat, lon, 0);
      const eq   = Astronomy.Equator('Moon', date, obs, true, true);
      const horiz = Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
      return { alt: horiz.altitude, az: horiz.azimuth };
    } catch(e) { return null; }
  }

  // ── Visible Planets ───────────────────────────────────────────────
  const PLANETS = ['Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune'];

  function visiblePlanets(date, lat, lon) {
    if (typeof Astronomy === 'undefined') return [];
    const obs = new Astronomy.Observer(lat, lon, 0);
    return PLANETS.map(name => {
      try {
        const eq    = Astronomy.Equator(name, date, obs, true, true);
        const horiz = Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
        const illum = Astronomy.Illumination(name, date);
        return {
          name,
          alt: horiz.altitude,
          az: horiz.azimuth,
          magnitude: illum.mag,
          above: horiz.altitude > 5
        };
      } catch(e) { return { name, alt: -99, az: 0, above: false }; }
    }).filter(p => p.above);
  }

  // ── Sun Position ──────────────────────────────────────────────────
  function sunAlt(date, lat, lon) {
    if (typeof Astronomy === 'undefined') {
      // rough approximation
      return sunAltApprox(date, lat, lon);
    }
    try {
      const obs   = new Astronomy.Observer(lat, lon, 0);
      const eq    = Astronomy.Equator('Sun', date, obs, true, true);
      const horiz = Astronomy.Horizon(date, obs, eq.ra, eq.dec, 'normal');
      return horiz.altitude;
    } catch(e) { return sunAltApprox(date, lat, lon); }
  }

  function sunAltApprox(date, lat, lon) {
    const jd = julianDate(date);
    const n  = jd - 2451545.0;
    const L  = (280.460 + 0.9856474 * n) % 360;
    const g  = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
    const lam = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2*g)) * Math.PI / 180;
    const eps = 23.439 * Math.PI / 180;
    const raSun  = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
    const decSun = Math.asin(Math.sin(eps) * Math.sin(lam));
    const raDeg  = ((raSun * 180 / Math.PI) % 360 + 360) % 360;
    const decDeg = decSun * 180 / Math.PI;
    const { alt } = equToHoriz(raDeg, decDeg, date, lat, lon);
    return alt;
  }

  // ── Astronomical Twilight times ────────────────────────────────────
  // Returns ISO strings for astro-dawn and astro-dusk (sun at -18°)
  function twilightTimes(date, lat, lon) {
    if (typeof Astronomy === 'undefined') return null;
    try {
      const obs = new Astronomy.Observer(lat, lon, 0);
      // Get the start of the calendar day in UTC
      const noon = new Date(date);
      noon.setUTCHours(12, 0, 0, 0);

      const dawn = Astronomy.SearchAltitude('Sun', obs, -1, noon, 1, -18);
      const dusk = Astronomy.SearchAltitude('Sun', obs,  1, noon, 1, -18);
      return {
        dawn: dawn ? dawn.date : null,
        dusk: dusk ? dusk.date : null
      };
    } catch(e) { return null; }
  }

  // ── Local Sidereal Time (H:M:S string) ───────────────────────────
  function lstString(date, lon) {
    const deg  = lst(date, lon);
    const hrs  = deg / 15;
    const h    = Math.floor(hrs);
    const m    = Math.floor((hrs - h) * 60);
    const s    = Math.floor(((hrs - h) * 60 - m) * 60);
    return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  }

  // ── Light Pollution Heuristic ─────────────────────────────────────
  // Very rough: marks major city centers (population heuristic, not real Bortle)
  const BIG_CITIES_LL = [
    [40.71,-74.01],[51.51,-0.13],[48.85,2.35],[35.68,139.69],
    [28.61,77.21],[37.77,-122.42],[34.05,-118.24],[41.88,-87.63],
    [55.75,37.62],[39.90,116.40],[19.08,72.88],[23.13,113.26],
    [-23.55,-46.63],[31.23,121.47],[30.04,31.24]
  ];

  function lightPollutionHigh(lat, lon) {
    return BIG_CITIES_LL.some(([la, lo]) => {
      const dlat = la - lat, dlon = lo - lon;
      return Math.sqrt(dlat*dlat + dlon*dlon) < 0.8; // ~80km
    });
  }

  // ── DSO visibility check ──────────────────────────────────────────
  function dsoVisibility(ra_hours, dec_deg, date, lat, lon) {
    const ra_deg = ra_hours * 15;
    const precessed = precess(ra_deg, dec_deg, date);
    const { alt } = equToHoriz(precessed.ra, precessed.dec, date, lat, lon);
    const sunA   = sunAlt(date, lat, lon);
    return {
      alt,
      ok:       alt > 20,
      low:      alt > 5 && alt <= 20,
      twilight: sunA > -18
    };
  }

  // ── All-night blend: get date/time for 3 sample times ─────────────
  function allNightSamples(date, lat, lon) {
    const d = new Date(date);
    // Try to pick astronomical dusk + midnight + dawn
    const tt = twilightTimes(d, lat, lon);
    let t1, t2, t3;
    if (tt && tt.dusk && tt.dawn) {
      t1 = tt.dusk;
      t2 = new Date((tt.dusk.getTime() + tt.dawn.getTime()) / 2);
      t3 = tt.dawn;
    } else {
      d.setHours(21, 0, 0, 0); t1 = new Date(d);
      d.setHours(0,  0, 0, 0); t1 = new Date(d); // midnight
      d.setDate(d.getDate() + 1);
      d.setHours(3,  0, 0, 0); t2 = new Date(d);
      d.setHours(5,  0, 0, 0); t3 = new Date(d);
    }
    return [t1, t2, t3];
  }

  // ── Ecliptic to Equatorial (J2000) ────────────────────────────────
  // Returns RA/Dec in degrees for ecliptic lon/lat
  function eclipticToEquatorial(lon_deg, lat_deg) {
    const DEG = Math.PI / 180;
    const eps = 23.4393 * DEG; // mean obliquity ~J2000
    const l   = lon_deg * DEG;
    const b   = lat_deg * DEG;

    const ra  = Math.atan2(Math.sin(l)*Math.cos(eps) - Math.tan(b)*Math.sin(eps), Math.cos(l));
    const dec = Math.asin(Math.sin(b)*Math.cos(eps) + Math.cos(b)*Math.sin(eps)*Math.sin(l));

    return { ra: ((ra / DEG) % 360 + 360) % 360, dec: dec / DEG };
  }

  // ── Generate ecliptic path points ─────────────────────────────────
  function eclipticPoints(date, lat, lon, cx, cy, R, mapCenter, isSouth) {
    const pts = [];
    for (let lon_e = 0; lon_e <= 360; lon_e += 2) {
      const eq = eclipticToEquatorial(lon_e, 0);
      const prec = precess(eq.ra, eq.dec, date);
      let pt;
      if (mapCenter === 'zenith') {
        pt = projectStar(prec.ra, prec.dec, date, lat, lon, cx, cy, R,
                         { projection: 'azeq', minAlt: -1, flip: false });
      } else {
        pt = projectPolar(prec.ra, prec.dec, date, lat, lon, cx, cy, R, isSouth);
      }
      if (pt) pts.push({ x: pt.x, y: pt.y, lon: lon_e });
    }
    return pts;
  }

  // Public API
  return {
    julianDate,
    gmst,
    lst,
    lstString,
    precess,
    equToHoriz,
    projectStar,
    projectPolar,
    projectAzEq,
    moonPhase,
    moonPosition,
    moonPhaseName,
    visiblePlanets,
    sunAlt,
    twilightTimes,
    lightPollutionHigh,
    dsoVisibility,
    allNightSamples,
    eclipticPoints,
    PLANETS
  };

})();
