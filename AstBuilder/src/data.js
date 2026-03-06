import { state, JSON_FILE_PATH, EXAMPLE_IMAGES_PATH } from './state.js';

export async function loadProductData() {
  const response = await fetch(`${JSON_FILE_PATH}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  state.productsData = await response.json();
}

export async function loadExampleImages() {
  const response = await fetch(`${EXAMPLE_IMAGES_PATH}?t=${Date.now()}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  state.exampleImagesData = await response.json();
}

export function findProductById(category, id) {
  if (!state.productsData) return null;
  const products = state.productsData[`${category}s`];
  return products ? products.find(p => p.id === id) : null;
}

export function getMatchingExampleImages(telescopeName, cameraName) {
  if (!state.exampleImagesData) return [];
  return state.exampleImagesData.filter(
    img => img.telescope === telescopeName && img.camera === cameraName
  );
}

/**
 * Find a random valid configuration using filter-then-pick (not brute-force retry).
 * Returns { telescope, mount, camera } or null.
 */
export function findRandomConfiguration(budget, lastRandom) {
  const data = state.productsData;
  if (!data) return null;

  const telescopes = data.telescopes.filter(t => t.price <= budget - 400);
  const mounts = data.mounts.filter(m => m.price <= budget - 400);
  const cameras = data.cameras.filter(c => c.price <= budget - 400);

  if (!telescopes.length || !mounts.length || !cameras.length) return null;

  // Build all valid combos that fit budget and payload
  const minTarget = budget * 0.7;
  const validCombos = [];

  for (const t of telescopes) {
    for (const m of mounts) {
      for (const c of cameras) {
        const total = t.price + m.price + c.price;
        if (total <= budget && t.specs.weight_kg + c.specs.weight_kg <= m.specs.payload_kg) {
          validCombos.push({ telescope: t, mount: m, camera: c, total });
        }
      }
    }
  }

  // Filter out previous random selection
  let candidates = validCombos;
  if (lastRandom && candidates.length > 1) {
    candidates = candidates.filter(
      c => c.telescope.id !== lastRandom.telescope ||
           c.mount.id !== lastRandom.mount ||
           c.camera.id !== lastRandom.camera
    );
  }

  // Prefer combos that use 70-100% of budget
  const onBudget = candidates.filter(c => c.total >= minTarget);
  const pool = onBudget.length > 0 ? onBudget : candidates;

  // 75% of the time try balanced (each item ~1/3 of budget)
  if (pool.length > 0 && Math.random() < 0.75) {
    const target = budget / 3;
    const tolerance = target * 0.4;
    const balanced = pool.filter(c =>
      Math.abs(c.telescope.price - target) <= tolerance &&
      Math.abs(c.mount.price - target) <= tolerance &&
      Math.abs(c.camera.price - target) <= tolerance
    );
    if (balanced.length > 0) {
      return balanced[Math.floor(Math.random() * balanced.length)];
    }
  }

  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return null;
}
