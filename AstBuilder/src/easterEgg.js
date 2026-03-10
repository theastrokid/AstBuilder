/**
 * Easter Egg: Budget Disaster Mode
 * Activates when budget drops below £600, replacing rig with joke items.
 * Restores real selections when budget returns to £600+.
 */

import { state } from './state.js';
import {
  getElements, clearVideoPreview, updateVideoPreview,
  populateDropdowns, updateSummary,
} from './ui.js';
import { updateCommunitySubmitState } from './community/communitySection.js';

const THRESHOLD = 600;

const EASTER_EGG_ITEMS = {
  telescope: {
    id: 'ee-telescope', name: 'Toilet Roll Tube', price: 0,
    specs: { aperture_mm: 45, focal_length_mm: 110, f_ratio: 2.4, weight_kg: 0.02 },
    video: '', affiliateUrl: '',
  },
  mount: {
    id: 'ee-mount', name: 'Pile of Books', price: 0,
    specs: { payload_kg: 2, weight_kg: 4.5 },
    video: '', affiliateUrl: '',
  },
  camera: {
    id: 'ee-camera', name: 'Old Webcam', price: 0,
    specs: { sensor: 'VGA', resolution_mp: 0.3, pixel_size_um: 5.6, sensor_px_w: 640, sensor_px_h: 480, weight_kg: 0.08 },
    video: '', affiliateUrl: '',
  },
};

const PLACEHOLDER_TEXT = {
  telescope: '\u{1F9FB} Toilet Roll Tube',
  mount: '\u{1F4DA} Pile of Books',
  camera: '\u{1F4F9} Old Webcam',
};

const BUY_BTN_TEXT = {
  telescope: 'Find in Cupboard',
  mount: 'Borrow from Office',
  camera: 'Proceed to Loft',
};

const BANNER_MESSAGES = [
  'Budget critical. Emergency astro rig deployed.',
  'Warning: professional equipment replaced with household engineering.',
  "You've entered bargain-bin observatory mode.",
];

let bannerEl = null;

// ── Public API ────────────────────────────────────────────────

export function isEasterEggActive() {
  return state.easterEggActive === true;
}

export function checkEasterEgg(budget) {
  if (budget < THRESHOLD && !state.easterEggActive) {
    enterEasterEgg();
  } else if (budget >= THRESHOLD && state.easterEggActive) {
    exitEasterEgg();
  }
}

// ── Internal ──────────────────────────────────────────────────

function enterEasterEgg() {
  const el = getElements();

  // Save real selections
  state.savedSelections = {
    telescope: state.currentSelections.telescope,
    mount: state.currentSelections.mount,
    camera: state.currentSelections.camera,
  };

  state.easterEggActive = true;

  // Override selections with joke items
  state.currentSelections.telescope = EASTER_EGG_ITEMS.telescope;
  state.currentSelections.mount = EASTER_EGG_ITEMS.mount;
  state.currentSelections.camera = EASTER_EGG_ITEMS.camera;

  // Set placeholder previews with Easter egg styling
  for (const cat of ['telescope', 'mount', 'camera']) {
    // Null out onerror before clearing — prevents async handler from hiding placeholder
    el[`${cat}Video`].onerror = null;
    clearVideoPreview(cat);
    const placeholder = el[`${cat}Placeholder`];
    placeholder.textContent = PLACEHOLDER_TEXT[cat];
    placeholder.className = 'placeholder easter-egg-placeholder';
    placeholder.style.display = 'flex';
  }

  // Replace dropdown options with joke items and disable
  for (const cat of ['telescope', 'mount', 'camera']) {
    const select = el[`${cat}Select`];
    const item = EASTER_EGG_ITEMS[cat];
    while (select.options.length > 0) select.remove(0);
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = `${PLACEHOLDER_TEXT[cat]} - £${item.price.toFixed(2)}`;
    select.appendChild(opt);
    select.value = item.id;
    select.disabled = true;
  }

  // Override Buy Now buttons
  for (const cat of ['telescope', 'mount', 'camera']) {
    const btn = el[`${cat}BuyBtn`];
    if (btn) {
      btn.textContent = BUY_BTN_TEXT[cat];
      btn.style.display = 'inline-block';
      btn.removeAttribute('href');
      btn.style.cursor = 'default';
      btn.style.opacity = '0.8';
    }
  }

  // Show banner
  showBanner();

  // Update UI
  updateSummary();
  updateCommunitySubmitState();
}

function exitEasterEgg() {
  const el = getElements();

  state.easterEggActive = false;

  // Restore real selections
  if (state.savedSelections) {
    state.currentSelections.telescope = state.savedSelections.telescope;
    state.currentSelections.mount = state.savedSelections.mount;
    state.currentSelections.camera = state.savedSelections.camera;
    state.savedSelections = null;
  }

  // Re-enable dropdowns
  el.telescopeSelect.disabled = false;
  el.mountSelect.disabled = false;
  el.cameraSelect.disabled = false;

  // Restore video previews and reset placeholder styling
  for (const cat of ['telescope', 'mount', 'camera']) {
    const placeholder = el[`${cat}Placeholder`];
    if (placeholder) {
      placeholder.className = 'placeholder';
    }
    const product = state.currentSelections[cat];
    if (product) {
      updateVideoPreview(cat, product);
    } else {
      clearVideoPreview(cat);
    }
  }

  // Restore Buy Now buttons
  for (const cat of ['telescope', 'mount', 'camera']) {
    const btn = el[`${cat}BuyBtn`];
    if (btn) {
      btn.textContent = 'Buy Now';
      btn.style.cursor = '';
      btn.style.opacity = '';
    }
  }

  // Remove banner
  hideBanner();

  // Update UI
  populateDropdowns();
  updateSummary();
  updateCommunitySubmitState();
}

function showBanner() {
  hideBanner();
  const msg = BANNER_MESSAGES[Math.floor(Math.random() * BANNER_MESSAGES.length)];
  bannerEl = document.createElement('div');
  bannerEl.className = 'easter-egg-banner';
  bannerEl.textContent = msg;

  const summary = document.getElementById('summary-section');
  if (summary) {
    summary.parentNode.insertBefore(bannerEl, summary);
  }
}

function hideBanner() {
  if (bannerEl) {
    bannerEl.remove();
    bannerEl = null;
  }
}
