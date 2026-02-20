import Papa from 'papaparse';
import { parseRA, parseDec } from './coordsParser';
import type { DeepSkyObject, ObjectClass } from '../types';

// ---------------------------------------------------------------------------
// Constellation abbreviation → full name
// ---------------------------------------------------------------------------
const CONSTELLATION_ABBREVS: Record<string, string> = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aqr: 'Aquarius', Aql: 'Aquila',
  Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga', Boo: 'Boötes', Cae: 'Caelum',
  Cam: 'Camelopardalis', Cnc: 'Cancer', CVn: 'Canes Venatici', CMa: 'Canis Major',
  CMi: 'Canis Minor', Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia',
  Cen: 'Centaurus', Cep: 'Cepheus', Cet: 'Cetus', Cha: 'Chamaeleon',
  Cir: 'Circinus', Col: 'Columba', Com: 'Coma Berenices', CrA: 'Corona Australis',
  CrB: 'Corona Borealis', Crv: 'Corvus', Crt: 'Crater', Cru: 'Crux',
  Cyg: 'Cygnus', Del: 'Delphinus', Dor: 'Dorado', Dra: 'Draco',
  Equ: 'Equuleus', Eri: 'Eridanus', For: 'Fornax', Gem: 'Gemini',
  Gru: 'Grus', Her: 'Hercules', Hor: 'Horologium', Hya: 'Hydra',
  Hyi: 'Hydrus', Ind: 'Indus', Lac: 'Lacerta', Leo: 'Leo',
  LMi: 'Leo Minor', Lep: 'Lepus', Lib: 'Libra', Lup: 'Lupus',
  Lyn: 'Lynx', Lyr: 'Lyra', Men: 'Mensa', Mic: 'Microscopium',
  Mon: 'Monoceros', Mus: 'Musca', Nor: 'Norma', Oct: 'Octans',
  Oph: 'Ophiuchus', Ori: 'Orion', Pav: 'Pavo', Peg: 'Pegasus',
  Per: 'Perseus', Phe: 'Phoenix', Pic: 'Pictor', Psc: 'Pisces',
  PsA: 'Piscis Austrinus', Pup: 'Puppis', Pyx: 'Pyxis', Ret: 'Reticulum',
  Sge: 'Sagitta', Sgr: 'Sagittarius', Sco: 'Scorpius', Scl: 'Sculptor',
  Sct: 'Scutum', Ser: 'Serpens', Sex: 'Sextans', Tau: 'Taurus',
  Tel: 'Telescopium', Tri: 'Triangulum', TrA: 'Triangulum Australe',
  Tuc: 'Tucana', UMa: 'Ursa Major', UMi: 'Ursa Minor', Vel: 'Vela',
  Vir: 'Virgo', Vol: 'Volans', Vul: 'Vulpecula',
};
const CONSTELLATION_FULL = new Set(Object.values(CONSTELLATION_ABBREVS));

// ---------------------------------------------------------------------------
// Curated common names for Messier & Caldwell objects
// Used when the CSV "name" field is just an NGC/IC designation or is missing.
// ---------------------------------------------------------------------------
const COMMON_NAMES: Record<string, string> = {
  // Messier
  M1: 'Crab Nebula', M2: 'Great Aquarius Cluster', M3: 'Great Cluster',
  M4: 'Scorpius Cluster', M5: 'Rose Cluster', M6: 'Butterfly Cluster',
  M7: 'Ptolemy Cluster', M8: 'Lagoon Nebula', M9: 'Ophiuchus Cluster',
  M10: 'Ophiuchus Cluster', M11: 'Wild Duck Cluster', M12: 'Gumball Cluster',
  M13: 'Hercules Cluster', M14: 'Ophiuchus Cluster', M15: 'Pegasus Cluster',
  M16: 'Eagle Nebula', M17: 'Omega Nebula', M18: 'Sagittarius Cluster',
  M19: 'Ophiuchus Cluster', M20: 'Trifid Nebula', M21: 'Webb\'s Cross',
  M22: 'Sagittarius Cluster', M23: 'Sagittarius Cluster', M24: 'Sagittarius Star Cloud',
  M25: 'Sagittarius Cluster', M26: 'Scutum Cluster', M27: 'Dumbbell Nebula',
  M28: 'Sagittarius Cluster', M29: 'Cooling Tower Cluster', M30: 'Capricornus Cluster',
  M31: 'Andromeda Galaxy', M32: 'Le Gentil Galaxy', M33: 'Triangulum Galaxy',
  M34: 'Perseus Cluster', M35: 'Shoe-Buckle Cluster', M36: 'Pinwheel Cluster',
  M37: 'January Salt-and-Pepper Cluster', M38: 'Starfish Cluster',
  M39: 'Cygnus Cluster', M40: 'Winnecke 4', M41: 'Little Beehive Cluster',
  M42: 'Great Orion Nebula', M43: 'De Mairan\'s Nebula', M44: 'Beehive Cluster',
  M45: 'Pleiades', M46: 'Puppis Cluster', M47: 'Puppis Cluster',
  M48: 'Hydra Cluster', M49: 'Virgo Giant', M50: 'Heart-Shaped Cluster',
  M51: 'Whirlpool Galaxy', M52: 'Salt-and-Pepper Cluster', M53: 'Coma Cluster',
  M54: 'Sagittarius Dwarf Cluster', M55: 'Summer Rose Cluster',
  M56: 'Lyra Cluster', M57: 'Ring Nebula', M58: 'Virgo Galaxy',
  M59: 'Virgo Elliptical', M60: 'Virgo Giant', M61: 'Virgo Spiral',
  M62: 'Scorpius Cluster', M63: 'Sunflower Galaxy', M64: 'Black Eye Galaxy',
  M65: 'Leo Triplet Galaxy', M66: 'Leo Triplet Galaxy', M67: 'King Cobra Cluster',
  M68: 'Hydra Cluster', M69: 'Sagittarius Cluster', M70: 'Sagittarius Cluster',
  M71: 'Sagitta Cluster', M72: 'Aquarius Cluster', M73: 'Aquarius Asterism',
  M74: 'Phantom Galaxy', M75: 'Sagittarius Cluster', M76: 'Little Dumbbell Nebula',
  M77: 'Cetus Galaxy', M78: 'Orion Reflection Nebula', M79: 'Lepus Cluster',
  M80: 'Scorpius Cluster', M81: 'Bode\'s Galaxy', M82: 'Cigar Galaxy',
  M83: 'Southern Pinwheel Galaxy', M84: 'Markarian\'s Chain', M85: 'Coma Galaxy',
  M86: 'Virgo Giant', M87: 'Virgo A Galaxy', M88: 'Coma Spiral',
  M89: 'Virgo Elliptical', M90: 'Virgo Elliptical', M91: 'Coma Barred Spiral',
  M92: 'Hercules Cluster', M93: 'Butterfly Cluster', M94: 'Croc\'s Eye Galaxy',
  M95: 'Leo Barred Spiral', M96: 'Leo Spiral', M97: 'Owl Nebula',
  M98: 'Coma Spiral', M99: 'Coma Pinwheel', M100: 'Mirror Galaxy',
  M101: 'Pinwheel Galaxy', M102: 'Spindle Galaxy', M103: 'Cassiopeia Cluster',
  M104: 'Sombrero Galaxy', M105: 'Leo Elliptical', M106: 'Canes Venatici Spiral',
  M107: 'Ophiuchus Cluster', M108: 'Surfboard Galaxy', M109: 'Vacuum Cleaner Galaxy',
  M110: 'Edward Young Star',
  // Caldwell
  C1: 'NGC 188 Star Cluster', C2: 'Ionized Planetary Nebula', C3: 'Sculptor Galaxy',
  C4: 'Iris Nebula', C5: 'IC 342 Galaxy', C6: 'Cat\'s Eye Nebula',
  C7: 'NGC 2403 Galaxy', C8: 'Copeland Septet', C9: 'Cave Nebula',
  C10: 'NGC 663 Cluster', C11: 'Bubble Nebula', C12: 'Fireworks Galaxy',
  C13: 'Owl Cluster', C14: 'Double Cluster East', C15: 'Double Cluster West',
  C16: 'NGC 7243 Cluster', C17: 'Blinking Planetary', C18: 'NGC 185 Galaxy',
  C19: 'IC 5146 Nebula', C20: 'North America Nebula', C21: 'Mizar Companion',
  C22: 'Blue Snowball', C23: 'Silver Sliver Galaxy', C24: 'Perseus Molecular Cloud',
  C25: 'Intergalactic Wanderer', C26: 'NGC 4244 Galaxy', C27: 'Crescent Nebula',
  C28: 'NGC 752 Cluster', C29: 'Skull Nebula', C30: 'Deer Lick Galaxy',
  C31: 'Flaming Star Nebula', C32: 'Whale Galaxy', C33: 'East Veil Nebula',
  C34: 'West Veil Nebula', C35: 'NGC 4889 Galaxy', C36: 'NGC 4559 Galaxy',
  C37: 'NGC 6885 Cluster', C38: 'NGC 4565 Galaxy', C39: 'Eskimo Nebula',
  C40: 'NGC 3626 Galaxy', C41: 'Hyades', C42: 'Great Cluster in Centaurus',
  C43: 'NGC 4169 Group', C44: 'NGC 7479 Galaxy', C45: 'NGC 5248 Galaxy',
  C46: 'Hubble\'s Variable Nebula', C47: 'NGC 6934 Cluster', C48: 'NGC 2775 Galaxy',
  C49: 'Rosette Nebula', C50: 'IC 2391 Cluster', C51: 'IC 1613 Galaxy',
  C52: 'NGC 4697 Galaxy', C53: 'Spindle Galaxy', C54: 'NGC 2506 Cluster',
  C55: 'Saturn Nebula', C56: 'NGC 6779 Cluster', C57: 'Barnard\'s Galaxy',
  C58: 'NGC 2360 Cluster', C59: 'Ghost of Jupiter', C60: 'Antennae Galaxies',
  C61: 'Peony Nebula', C62: 'NGC 247 Galaxy', C63: 'Helix Nebula',
  C64: 'Sculptor Galaxy', C65: 'Centaurus A', C66: 'NGC 5694 Cluster',
  C67: 'NGC 1097 Galaxy', C68: 'NGC 6729 Nebula', C69: 'Bug Nebula',
  C70: 'NGC 300 Galaxy', C71: 'NGC 2477 Cluster', C72: 'NGC 55 Galaxy',
  C73: 'NGC 1851 Cluster', C74: 'Eight Burst Nebula', C75: 'NGC 6124 Cluster',
  C76: 'NGC 6231 Cluster', C77: 'Centaurus Galaxy Group', C78: 'NGC 6541 Cluster',
  C79: 'NGC 3201 Cluster', C80: 'Omega Centauri', C81: 'Omicron Velorum Cluster',
  C82: 'NGC 6752 Cluster', C83: 'NGC 4945 Galaxy', C84: 'NGC 5286 Cluster',
  C85: 'IC 2391 Cluster', C86: 'NGC 6397 Cluster', C87: 'NGC 1261 Cluster',
  C88: 'NGC 5823 Cluster', C89: 'NGC 6087 Cluster', C90: 'NGC 2867 Nebula',
  C91: 'NGC 3532 Cluster', C92: 'Eta Carinae Nebula', C93: 'NGC 6752 Cluster',
  C94: 'Jewel Box', C95: 'NGC 6025 Cluster', C96: 'NGC 2516 Cluster',
  C97: 'NGC 3766 Cluster', C98: 'NGC 4609 Cluster', C99: 'Coalsack Nebula',
  C100: 'IC 2944 Cluster', C101: 'NGC 6744 Galaxy', C102: 'NGC 2516 Cluster',
  C103: 'Tarantula Nebula', C104: 'NGC 362 Cluster', C105: 'NGC 4833 Cluster',
  C106: 'NGC 104 Cluster', C107: 'NGC 6101 Cluster', C108: 'NGC 4372 Cluster',
  C109: 'NGC 3195 Nebula',
};

function cleanConstellation(raw: string): string {
  if (!raw?.trim()) return 'Unknown';
  const trimmed = raw.trim();
  if (CONSTELLATION_ABBREVS[trimmed]) return CONSTELLATION_ABBREVS[trimmed];
  if (CONSTELLATION_FULL.has(trimmed)) return trimmed;
  const words = trimmed.split(/[\s,]+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (CONSTELLATION_ABBREVS[w]) return CONSTELLATION_ABBREVS[w];
    if (CONSTELLATION_FULL.has(w)) return w;
  }
  const last = words.reverse().find((w) => /^[A-Za-z]/.test(w) && w.length > 2);
  return last ?? trimmed;
}

// ---------------------------------------------------------------------------
// Object type → normalised class
// ---------------------------------------------------------------------------
export function normalizeObjectClass(rawType: string): ObjectClass {
  const t = rawType.toLowerCase().trim();
  if (t === 'galaxy' || t === 'elliptical galaxy' || t === 'spiral galaxy' ||
      t === 'irregular galaxy' || t === 'galaxy pair' || t.startsWith('g-')) {
    return 'Galaxy';
  }
  if (t === 'planetary nebula' || t === 'pn') return 'Planetary Nebula';
  if (t === 'globular cluster' || t === 'gc') return 'Globular Cluster';
  if (t === 'open cluster' || t === 'oc' || t === 'cluster + nebulosity' ||
      t === 'cluster nebulosity' || t === 'double star') return 'Star Cluster';
  return 'Nebula';
}

// ---------------------------------------------------------------------------
// Name helpers
// ---------------------------------------------------------------------------
/** Returns the primary common name (before first comma). */
export function cleanObjectName(raw: string): string {
  return raw.split(',')[0].trim();
}

/**
 * Determines the best display name for an object.
 * If the CSV name is just a bare catalog designation (e.g. "NGC 2682"),
 * we substitute the catalog ID (e.g. "M67") or a curated common name.
 */
function resolveName(id: string, rawName: string): string {
  const primary = cleanObjectName(rawName);

  // If it's a real common name (not just a catalog number), keep it
  const isCatalogDesig = /^(NGC|IC|UGC|Messier)\s*\d+$/i.test(primary);
  if (!isCatalogDesig && primary.length > 1) return primary;

  // Prefer curated common name
  if (COMMON_NAMES[id]) return COMMON_NAMES[id];

  // Fall back to the catalog ID as display name (better than "NGC 7089")
  return id;
}

// ---------------------------------------------------------------------------
// CSV parsing – Messier and Caldwell ONLY
// ---------------------------------------------------------------------------
export async function loadCatalog(csvUrl: string): Promise<DeepSkyObject[]> {
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error(`Failed to load catalog: ${response.status}`);
  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(text, {
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = results.data;
          if (!rows.length) { resolve([]); return; }

          const objects: DeepSkyObject[] = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (row.length < 8) continue;

            const catalog = (row[0] ?? '').trim();
            const id      = (row[1] ?? '').trim();

            // ── HARD FILTER: only Messier (M*) and Caldwell (C*) ──
            const isMC = /^M\d+$/i.test(id) || /^C\d+$/i.test(id);
            if (!isMC) continue;
            // Extra guard: also reject if catalog column contains NGC
            if (catalog.toUpperCase() === 'NGC') continue;

            const nameFull         = (row[2] ?? '').trim();
            const objectType       = (row[3] ?? '').trim();
            const magnitudeRaw     = (row[4] ?? '').trim();
            const constellationRaw = (row[5] ?? '').trim();
            const raRaw            = (row[6] ?? '').trim();
            const decRaw           = (row[7] ?? '').trim();
            const messierOverlap   = (row[8] ?? '').trim();

            if (!raRaw || !decRaw) continue;

            const magnitude  = magnitudeRaw ? parseFloat(magnitudeRaw) : null;
            const raDecimal  = parseRA(raRaw);
            const decDecimal = parseDec(decRaw);
            if (isNaN(raDecimal) || isNaN(decDecimal)) continue;

            const name = resolveName(id, nameFull);

            objects.push({
              catalog,
              id,
              name,
              objectType: objectType || 'Unknown',
              normalizedClass: normalizeObjectClass(objectType),
              magnitude: isNaN(magnitude as number) ? null : magnitude,
              constellation: cleanConstellation(constellationRaw),
              raRaw,
              decRaw,
              raDecimal,
              decDecimal,
              messierOverlap: messierOverlap || undefined,
            });
          }

          resolve(objects);
        } catch (err) { reject(err); }
      },
      error: reject,
    });
  });
}
