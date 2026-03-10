import './styles.css';
import { state } from './src/state.js';
import { loadProductData, loadExampleImages, findProductById, findRandomConfiguration } from './src/data.js';
import { calculateSpentBudget } from './src/calculations.js';
import {
  initElements, getElements,
  populateDropdowns, updateVideoPreview, clearVideoPreview,
  updateSummary, updateBudgetDisplay,
  populateConveyorBelt, updateConveyorMatches,
  closeModal, showError, handleShareRig,
} from './src/ui.js';
import { initCommunitySection, updateCommunitySubmitState } from './src/community/communitySection.js';
import { renderRigDetailPage, hideRigDetailPage } from './src/community/rigDetailPage.js';
import { launchGame } from './src/priceIsRight/gameUI.js';
import { initCursorTrail } from './src/cursorTrail.js';

// ── Bootstrap ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const el = initElements();

  el.telescopeSelect.addEventListener('change', () => handleSelectionChange('telescope'));
  el.mountSelect.addEventListener('change', () => handleSelectionChange('mount'));
  el.cameraSelect.addEventListener('change', () => handleSelectionChange('camera'));
  el.buyNowBtn.addEventListener('click', handleBuyNowClick);

  el.budgetSlider.addEventListener('input', handleBudgetChange);
  el.randomBtn.addEventListener('click', handleRandomSelection);
  el.shareBtn.addEventListener('click', handleShareRig);
  document.getElementById('pir-btn').addEventListener('click', launchGame);
  el.modalClose.addEventListener('click', closeModal);
  el.modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  initCursorTrail();
  updateBudgetDisplay();
  updateSliderThumbColor(el.budgetSlider);
  initTitleCycle();

  loadProductData()
    .then(() => {
      populateDropdowns();
      if (!applyUrlState()) setDefaultSelections();
    })
    .catch((err) => { console.error('Error loading product data:', err); showError(); });

  loadExampleImages()
    .then(() => populateConveyorBelt())
    .catch((err) => console.error('Error loading example images:', err));

  // ── Community submissions ────────────────────────────────────
  initCommunitySection();

  // ── Hash-based routing (detail page) ─────────────────────────
  handleRouteChange();
  window.addEventListener('hashchange', handleRouteChange);
});

// ── URL state (shareable links) ─────────────────────────────────

function applyUrlState() {
  const params = new URLSearchParams(window.location.search);
  const tId = params.get('telescope');
  const mId = params.get('mount');
  const cId = params.get('camera');
  if (!tId && !mId && !cId) return false;

  const t = tId ? findProductById('telescope', tId) : null;
  const m = mId ? findProductById('mount', mId) : null;
  const c = cId ? findProductById('camera', cId) : null;
  if (!t && !m && !c) return false;

  if (t) { state.currentSelections.telescope = t; updateVideoPreview('telescope', t); }
  if (m) { state.currentSelections.mount = m; updateVideoPreview('mount', m); }
  if (c) { state.currentSelections.camera = c; updateVideoPreview('camera', c); }
  populateDropdowns();
  updateSummary();
  pushUrlState();
  updateCommunitySubmitState();
  return true;
}

function pushUrlState() {
  const p = new URLSearchParams();
  const { telescope, mount, camera } = state.currentSelections;
  if (telescope) p.set('telescope', telescope.id);
  if (mount) p.set('mount', mount.id);
  if (camera) p.set('camera', camera.id);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

// ── Event handlers ──────────────────────────────────────────────

function handleSelectionChange(category) {
  const el = getElements();
  const id = el[`${category}Select`].value;

  if (id) {
    const product = findProductById(category, id);
    if (product) {
      state.currentSelections[category] = product;
      updateVideoPreview(category, product);
    }
  } else {
    state.currentSelections[category] = null;
    clearVideoPreview(category);
  }

  populateDropdowns();
  updateSummary();
  pushUrlState();
  updateCommunitySubmitState();
}

function handleBuyNowClick() {
  const { telescope, mount, camera } = state.currentSelections;
  if (!telescope || !mount || !camera) return;
  const urls = [telescope.affiliateUrl, mount.affiliateUrl, camera.affiliateUrl];
  if (urls.some(u => !u)) return;
  for (const url of urls) window.open(url, '_blank', 'noopener,noreferrer');
}

function initTitleCycle() {
  const titles = ["Damon Scotting's", "The Telescope Man's"];
  let idx = 0;
  const textEl = document.querySelector('.title-text');
  const h1 = document.querySelector('.title-cycle');
  if (!textEl || !h1) return;

  function spawnDust(container) {
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('span');
      p.className = 'stardust-particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.setProperty('--rand-x', Math.random().toFixed(2));
      p.style.setProperty('--rand-y', Math.random().toFixed(2));
      p.style.animationDelay = `${Math.random() * 0.3}s`;
      p.style.animationDuration = `${0.5 + Math.random() * 0.6}s`;
      container.appendChild(p);
      p.addEventListener('animationend', () => p.remove());
    }
  }

  function cycle() {
    // Dissolve out
    textEl.classList.add('title-dissolve-out');
    spawnDust(h1);
    setTimeout(() => {
      idx = (idx + 1) % titles.length;
      textEl.textContent = titles[idx];
      textEl.classList.remove('title-dissolve-out');
      textEl.classList.add('title-dissolve-in');
      spawnDust(h1);
      setTimeout(() => textEl.classList.remove('title-dissolve-in'), 600);
    }, 600);
  }

  // First swap after 2 seconds, then every 6 seconds
  setTimeout(() => {
    cycle();
    setInterval(cycle, 6000);
  }, 2000);
}

function updateSliderThumbColor(slider) {
  const min = parseFloat(slider.min) || 0;
  const max = parseFloat(slider.max) || 10000;
  const val = parseFloat(slider.value);
  const pct = (val - min) / (max - min); // 0 = £0, 1 = £10k
  // Green (hue 130) at 0% → Red (hue 0) at 100%, saturation fixed at 60%, lightness 65%
  const hue = Math.round(130 * (1 - pct));
  const color = `hsl(${hue}, 60%, 65%)`;
  const glow = `hsla(${hue}, 60%, 55%, 0.45)`;
  slider.style.setProperty('--slider-thumb-color', color);
  slider.style.setProperty('--slider-thumb-glow', glow);
}

function handleBudgetChange() {
  const el = getElements();
  state.currentBudget = parseInt(el.budgetSlider.value);
  updateBudgetDisplay();
  updateSliderThumbColor(el.budgetSlider);

  // Preserve valid selections; drop the most expensive ones that bust the budget
  const spent = calculateSpentBudget(state.currentSelections);
  if (spent > state.currentBudget) {
    const cats = ['telescope', 'mount', 'camera']
      .filter(c => state.currentSelections[c])
      .sort((a, b) => state.currentSelections[b].price - state.currentSelections[a].price);
    let total = spent;
    for (const cat of cats) {
      if (total <= state.currentBudget) break;
      total -= state.currentSelections[cat].price;
      state.currentSelections[cat] = null;
      clearVideoPreview(cat);
    }
  }

  // Auto-select the cheapest affordable option for any empty category
  if (state.productsData) {
    const categoryMap = {
      telescope: state.productsData.telescopes,
      mount: state.productsData.mounts,
      camera: state.productsData.cameras,
    };
    for (const [cat, products] of Object.entries(categoryMap)) {
      if (!state.currentSelections[cat]) {
        const otherSpent = calculateSpentBudget({
          ...state.currentSelections,
          [cat]: null,
        });
        const remaining = state.currentBudget - otherSpent;
        const affordable = products
          .filter(p => p.price <= remaining)
          .sort((a, b) => a.price - b.price);
        if (affordable.length > 0) {
          state.currentSelections[cat] = affordable[0];
          updateVideoPreview(cat, affordable[0]);
        }
      }
    }
    populateDropdowns();
  }

  updateSummary();
  pushUrlState();
  updateCommunitySubmitState();
}


function handleRandomSelection() {
  const combo = findRandomConfiguration(state.currentBudget, state.lastRandomSelection);
  if (!combo) return;

  state.currentSelections.telescope = combo.telescope;
  state.currentSelections.mount = combo.mount;
  state.currentSelections.camera = combo.camera;
  state.lastRandomSelection = { telescope: combo.telescope.id, mount: combo.mount.id, camera: combo.camera.id };

  populateDropdowns();
  updateVideoPreview('telescope', combo.telescope);
  updateVideoPreview('mount', combo.mount);
  updateVideoPreview('camera', combo.camera);
  updateSummary();
  pushUrlState();
  updateCommunitySubmitState();
}

function setDefaultSelections() {
  if (!state.productsData) return;
  const t = state.productsData.telescopes.find(x => x.id === 't18');
  const m = state.productsData.mounts.find(x => x.id === 'm9');
  const c = state.productsData.cameras.find(x => x.id === 'c12');

  if (t && m && c) {
    state.currentSelections = { telescope: t, mount: m, camera: c };
    populateDropdowns();
    updateVideoPreview('telescope', t);
    updateVideoPreview('mount', m);
    updateVideoPreview('camera', c);
    updateSummary();
    pushUrlState();
    updateCommunitySubmitState();
  } else {
    handleRandomSelection();
  }
}

// ── Hash routing for community detail page ───────────────────────

function handleRouteChange() {
  const hash = window.location.hash;
  const rigMatch = hash.match(/^#\/community\/rig\/(.+)$/);
  if (rigMatch) {
    renderRigDetailPage(rigMatch[1]);
  } else {
    hideRigDetailPage();
  }
}
