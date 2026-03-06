import { state } from '../state.js';

export const TOTAL_ROUNDS = 3;
export const GUESS_MIN = 900;
export const GUESS_MAX = 10000;

export const SCORING_TIERS = [
  { within: 0.02, points: 10, label: 'INCREDIBLE!' },
  { within: 0.10, points: 5,  label: 'Impressive!' },
  { within: 0.20, points: 3,  label: 'Nice read!' },
  { within: 0.30, points: 1,  label: 'Not bad!' },
];

export const gameState = {
  active: false,
  currentRound: 0,
  rounds: [],
  totalScore: 0,
  phase: 'idle',
  currentRig: null,
  usedItems: new Set(),
  lastTotal: 0,
};

export function resetGame() {
  gameState.active = false;
  gameState.currentRound = 0;
  gameState.rounds = [];
  gameState.totalScore = 0;
  gameState.phase = 'idle';
  gameState.currentRig = null;
  gameState.usedItems = new Set();
  gameState.lastTotal = 0;
}

export function generateGameRig() {
  const data = state.productsData;
  if (!data) return null;

  const { telescopes, mounts, cameras } = data;

  // Build valid combos excluding any previously used individual items
  const validCombos = [];
  for (const t of telescopes) {
    if (gameState.usedItems.has(t.id)) continue;
    for (const m of mounts) {
      if (gameState.usedItems.has(m.id)) continue;
      for (const c of cameras) {
        if (gameState.usedItems.has(c.id)) continue;
        const total = t.price + m.price + c.price;
        if (total >= GUESS_MIN && total <= GUESS_MAX &&
            t.specs.weight_kg + c.specs.weight_kg <= m.specs.payload_kg) {
          validCombos.push({ telescope: t, mount: m, camera: c, total });
        }
      }
    }
  }

  if (validCombos.length === 0) return null;

  // Pick a combo whose total is far from the last round's total for variety
  let pick;
  if (gameState.lastTotal > 0 && validCombos.length > 5) {
    // Sort by distance from last total, pick from the top 30%
    const sorted = validCombos.slice().sort((a, b) =>
      Math.abs(b.total - gameState.lastTotal) - Math.abs(a.total - gameState.lastTotal)
    );
    const pool = sorted.slice(0, Math.max(3, Math.ceil(sorted.length * 0.3)));
    pick = pool[Math.floor(Math.random() * pool.length)];
  } else {
    pick = validCombos[Math.floor(Math.random() * validCombos.length)];
  }

  // Mark all 3 items as used so they never appear again this game
  gameState.usedItems.add(pick.telescope.id);
  gameState.usedItems.add(pick.mount.id);
  gameState.usedItems.add(pick.camera.id);
  gameState.lastTotal = pick.total;

  return pick;
}

export function scoreGuess(guess, actual) {
  const diff = Math.abs(guess - actual) / actual;
  for (const tier of SCORING_TIERS) {
    if (diff <= tier.within) {
      return { points: tier.points, label: tier.label, diff, pct: (diff * 100).toFixed(1) };
    }
  }
  return { points: 0, label: 'Better luck next round!', diff, pct: (diff * 100).toFixed(1) };
}
