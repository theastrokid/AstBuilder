import type { GeocodeSuggestion } from '../types';
import { geoCacheGet, geoCacheSet } from './storage';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'WhatCanISeeTonightApp/0.1 (astronomy observer tool)';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

export async function geocodeCity(query: string): Promise<GeocodeSuggestion[]> {
  if (!query.trim()) return [];

  const cached = geoCacheGet(query);
  if (cached) return cached as GeocodeSuggestion[];

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '0');
  url.searchParams.set('featuretype', 'city,town,village,municipality,county');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en',
    },
  });

  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);

  const data: NominatimResult[] = await res.json();

  const suggestions: GeocodeSuggestion[] = data
    .filter((r) => r.importance > 0.3 || data.length <= 2)
    .slice(0, 5)
    .map((r) => ({
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }));

  geoCacheSet(query, suggestions);
  return suggestions;
}

/** Reverse-geocode a lat/lon to a city name */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lon.toString());
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '10');

  const res = await fetch(url.toString(), {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept-Language': 'en',
    },
  });

  if (!res.ok) return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;

  const data = await res.json();
  const addr = data.address ?? {};
  const city =
    addr.city || addr.town || addr.village || addr.county || addr.state || data.display_name;
  return city ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
}

/** Create a debounced version of geocodeCity */
export function createDebouncedGeocoder(delay = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (query: string, callback: (results: GeocodeSuggestion[], error?: string) => void) => {
    if (timer) clearTimeout(timer);
    if (!query.trim()) {
      callback([]);
      return;
    }
    timer = setTimeout(async () => {
      try {
        const results = await geocodeCity(query);
        callback(results);
      } catch (err) {
        callback([], err instanceof Error ? err.message : 'Geocoding error');
      }
    }, delay);
  };
}
