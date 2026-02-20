import { angularDistance } from './angularDistance';
import type {
  DeepSkyObject,
  ObjectClass,
  ObjectWithDistance,
  ClosestByClass,
  PosterData,
  CoordinatesResult,
} from '../types';

const ALL_CLASSES: ObjectClass[] = [
  'Galaxy',
  'Planetary Nebula',
  'Star Cluster',
  'Nebula',
  'Globular Cluster',
];

/**
 * Finds the single closest object in each of the 5 normalised classes
 * to the given sky coordinates.
 */
export function findClosestByClass(
  catalog: DeepSkyObject[],
  raDecimal: number,
  decDecimal: number,
): ClosestByClass {
  const result: ClosestByClass = {
    Galaxy: null,
    'Planetary Nebula': null,
    'Star Cluster': null,
    Nebula: null,
    'Globular Cluster': null,
  };

  for (const obj of catalog) {
    const dist = angularDistance(raDecimal, decDecimal, obj.raDecimal, obj.decDecimal);
    const cls = obj.normalizedClass;
    const current = result[cls];
    if (!current || dist < current.distance) {
      result[cls] = { object: obj, distance: dist };
    }
  }

  return result;
}

/**
 * Builds the complete PosterData from inputs.
 *
 * @param catalog    Full parsed catalog.
 * @param coords     Derived coordinates from the name.
 * @param name1      Primary name / first name.
 * @param name2      Secondary name (may be empty).
 * @param primaryType Desired main object class (or null for auto).
 */
export function buildPosterData(
  catalog: DeepSkyObject[],
  coords: CoordinatesResult,
  name1: string,
  name2: string,
  primaryType: ObjectClass | null,
): PosterData {
  const { raDecimal, decDecimal } = coords;

  const closest = findClosestByClass(catalog, raDecimal, decDecimal);

  // Determine main object
  let mainEntry: ObjectWithDistance | null = null;

  if (primaryType && closest[primaryType]) {
    mainEntry = closest[primaryType];
  } else {
    // Auto: pick the globally closest among all 5 winners
    for (const cls of ALL_CLASSES) {
      const candidate = closest[cls];
      if (candidate && (!mainEntry || candidate.distance < mainEntry.distance)) {
        mainEntry = candidate;
      }
    }
  }

  if (!mainEntry) {
    throw new Error('No objects found in catalog');
  }

  const mainObject = mainEntry.object;
  const mainDistance = mainEntry.distance;

  // Collect the other 4 (or fewer) – exclude the main object
  const others: ObjectWithDistance[] = ALL_CLASSES.flatMap((cls) => {
    const entry = closest[cls];
    if (!entry) return [];
    if (entry.object.id === mainObject.id) return [];
    return [entry];
  });

  // Sort by distance ascending, take first 4
  others.sort((a, b) => a.distance - b.distance);
  const otherObjects = others.slice(0, 4);

  return {
    name1: name1.trim(),
    name2: name2.trim(),
    fullInput: [name1, name2].filter(Boolean).join(' '),
    coords,
    mainObject,
    mainDistance,
    otherObjects,
    primaryType,
  };
}

/**
 * Generates a nice display title for the poster from an object's name.
 * Examples:
 *   "Great Orion Nebula" → "THE GREAT ORION NEBULA"
 *   "Andromeda"          → "THE ANDROMEDA GALAXY"
 *   "NGC 7009"           → "NGC 7009 PLANETARY NEBULA"
 */
export function getPosterTitle(obj: DeepSkyObject): string {
  const cleanName = obj.name.trim().toUpperCase();

  // If name is just a catalog designation (NGC/IC/UGC/M/C + number), append the class
  const isCatalogOnly = /^(NGC|IC|UGC)\s+\d+$/i.test(cleanName)
    || /^[MC]\d+$/i.test(cleanName);
  if (isCatalogOnly) {
    // Use the object id for M/C, the raw designation for NGC/IC/UGC
    const label = /^[MC]\d+$/i.test(cleanName) ? obj.id : cleanName;
    return `${label} ${obj.normalizedClass.toUpperCase()}`;
  }

  const prefix = cleanName.startsWith('THE') ? '' : 'THE ';

  // Determine if the class is already mentioned in the name
  const classWords = obj.normalizedClass.toUpperCase().split(' ');
  const hasClassWord = classWords.some((w) => cleanName.includes(w));

  if (hasClassWord) {
    return `${prefix}${cleanName}`;
  }

  return `${prefix}${cleanName} ${obj.normalizedClass.toUpperCase()}`;
}

export { ALL_CLASSES };
