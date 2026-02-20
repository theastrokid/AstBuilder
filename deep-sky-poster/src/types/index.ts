export type ObjectClass =
  | 'Galaxy'
  | 'Planetary Nebula'
  | 'Star Cluster'
  | 'Nebula'
  | 'Globular Cluster';

export interface DeepSkyObject {
  catalog: string;
  id: string;
  name: string;
  objectType: string;
  normalizedClass: ObjectClass;
  magnitude: number | null;
  constellation: string;
  raRaw: string;
  decRaw: string;
  raDecimal: number;   // degrees
  decDecimal: number;  // degrees
  messierOverlap?: string;
}

export interface CoordinatesResult {
  ra: { h: number; m: number; s: number };
  dec: { sign: '+' | '-'; d: number; m: number; s: number };
  raDecimal: number;
  decDecimal: number;
  digitStream: number[];
}

export interface ObjectWithDistance {
  object: DeepSkyObject;
  distance: number; // angular separation in degrees
}

export interface ClosestByClass {
  Galaxy: ObjectWithDistance | null;
  'Planetary Nebula': ObjectWithDistance | null;
  'Star Cluster': ObjectWithDistance | null;
  Nebula: ObjectWithDistance | null;
  'Globular Cluster': ObjectWithDistance | null;
}

export interface PosterData {
  name1: string;
  name2: string;
  fullInput: string;
  coords: CoordinatesResult;
  mainObject: DeepSkyObject;
  mainDistance: number;
  otherObjects: ObjectWithDistance[];
  primaryType: ObjectClass | null;
}
