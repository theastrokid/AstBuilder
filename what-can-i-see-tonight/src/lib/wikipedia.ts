import { wikiImageGet, wikiImageSet } from './storage';

const API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

interface WikiSummary {
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
}

/**
 * Fetch the thumbnail image URL for a Wikipedia article.
 * Returns null if no image is found.
 * Uses localStorage cache to avoid repeated API calls.
 */
export async function fetchWikiImage(title: string): Promise<string | null> {
  // Check cache first
  const cached = wikiImageGet(title);
  if (cached !== undefined) return cached;

  try {
    const url = `${API_BASE}${encodeURIComponent(title)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });

    if (!res.ok) {
      wikiImageSet(title, null);
      return null;
    }

    const data: WikiSummary = await res.json();
    const imageUrl = data.thumbnail?.source ?? null;
    wikiImageSet(title, imageUrl);
    return imageUrl;
  } catch {
    wikiImageSet(title, null);
    return null;
  }
}

/** Get the Wikipedia article URL */
export function wikiArticleUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
}

/**
 * Convert a remote image URL to a data URL for embedding in PDFs.
 * Returns null if cross-origin or network issues occur.
 */
export async function imageUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
