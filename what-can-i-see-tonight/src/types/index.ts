export type TargetType =
  | 'galaxy'
  | 'nebula'
  | 'cluster'
  | 'globular'
  | 'planetaryNebula'
  | 'doubleCluster'
  | 'asterism'
  | 'supernovaRemnant'
  | 'other';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DeepSkyTarget {
  id: string;
  name: string;
  type: TargetType;
  constellation: string;
  /** Right Ascension in decimal hours (0–24) */
  ra: number;
  /** Declination in decimal degrees (-90–90) */
  dec: number;
  magnitude: number;
  sizeArcMin?: number;
  difficulty: Difficulty;
  howToSpot: string;
  wikipediaTitle: string;
}

export interface Location {
  lat: number;
  lon: number;
  cityName: string;
}

export interface NightWindow {
  start: Date;
  end: Date;
  moonPhase: number;       // 0–360 degrees
  moonIllumination: number; // 0–100 percent
}

export interface RankedTarget {
  target: DeepSkyTarget;
  maxAltitude: number;
  bestTime: Date;
  score: number;
  wikiImageUrl?: string;
  altSamples: AltSample[];
}

export interface TelescopeConfig {
  focalLength: number;     // mm
  aperture: number;        // mm
  reducerFactor: number;   // e.g. 0.8; use 1 for none
}

export interface CameraConfig {
  name: string;
  sensorWidth: number;    // mm
  sensorHeight: number;   // mm
}

export interface Settings {
  telescope: TelescopeConfig;
  camera: CameraConfig;
  minAltitudeDeg: number;
  beginnerMode: boolean;
  reportColor: boolean;
  reportCompact: boolean;
  reportWeekly: boolean;
}

export interface AltSample {
  time: Date;
  altitude: number;
}

export interface AppState {
  location: Location | null;
  nightWindow: NightWindow | null;
  rankedTargets: RankedTarget[];
  settings: Settings;
  loading: boolean;
  error: string | null;
}

export interface GeocodeSuggestion {
  displayName: string;
  lat: number;
  lon: number;
}
