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
import { checkEasterEgg, isEasterEggActive } from './src/easterEgg.js';

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
  if (isEasterEggActive()) return;
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

  let isTransitioning = false;
  let activeParticles = 0;
  const MAX_PARTICLES = 120;

  function spawnDustCloud() {
    const h1Rect = h1.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();
    const offsetX = textRect.left - h1Rect.left;
    const offsetY = textRect.top - h1Rect.top;
    const w = textRect.width;
    const th = textRect.height;

    // 4 staggered waves of dense particles across the text area
    for (let wave = 0; wave < 4; wave++) {
      const count = 22 + Math.floor(Math.random() * 8);
      for (let i = 0; i < count; i++) {
        if (activeParticles >= MAX_PARTICLES) return;
        const p = document.createElement('span');
        p.className = 'cosmic-dust';

        // Spread particles across text area with some overflow
        const cx = offsetX - w * 0.05 + Math.random() * w * 1.1;
        const cy = offsetY - th * 0.15 + Math.random() * th * 1.3;

        const angle = Math.random() * Math.PI * 2;
        const dist = 10 + Math.random() * 30;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist * 0.5;
        const dz = (Math.random() - 0.5) * 15;
        const size = 2 + Math.random() * 3;
        const r = 200 + Math.floor(Math.random() * 55);
        const g = 215 + Math.floor(Math.random() * 40);
        const glowAlpha = (0.4 + Math.random() * 0.5).toFixed(2);

        p.style.left = `${cx}px`;
        p.style.top = `${cy}px`;
        p.style.setProperty('--dx', `${dx.toFixed(1)}px`);
        p.style.setProperty('--dy', `${dy.toFixed(1)}px`);
        p.style.setProperty('--dz', `${dz.toFixed(1)}px`);
        p.style.setProperty('--dust-size', `${size.toFixed(1)}px`);
        p.style.setProperty('--dust-color', `rgb(${r}, ${g}, 255)`);
        p.style.setProperty('--dust-glow', `${(size + 5).toFixed(0)}px`);
        p.style.setProperty('--dust-glow-color', `rgba(96, 128, 224, ${glowAlpha})`);
        p.style.setProperty('--dust-dur', `${(700 + Math.random() * 500).toFixed(0)}ms`);
        p.style.setProperty('--dust-delay', `${(wave * 120 + Math.random() * 150).toFixed(0)}ms`);
        p.style.setProperty('--dust-start-opacity', '1');

        h1.appendChild(p);
        activeParticles++;
        p.addEventListener('animationend', () => { p.remove(); activeParticles--; });
      }
    }
  }

  function cycle() {
    if (isTransitioning) return;
    isTransitioning = true;

    const nextIdx = (idx + 1) % titles.length;

    // Create bright shroud overlay to obscure the text swap
    const shroud = document.createElement('div');
    shroud.className = 'title-shroud';
    h1.appendChild(shroud);

    // Create ghost of current text (fades out, absolute positioned)
    const ghost = document.createElement('span');
    ghost.className = 'title-ghost';
    ghost.textContent = titles[idx];
    h1.appendChild(ghost);

    // Set new text and fade it in
    textEl.textContent = titles[nextIdx];
    textEl.classList.add('title-fade-in');

    // Spawn dense particle cloud
    spawnDustCloud();

    // Clean up after animations complete
    setTimeout(() => {
      ghost.remove();
      shroud.remove();
      textEl.classList.remove('title-fade-in');
      idx = nextIdx;
      isTransitioning = false;
    }, 1050);
  }

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
  checkEasterEgg(state.currentBudget);
  updateBudgetDisplay();
  updateSliderThumbColor(el.budgetSlider);
  if (isEasterEggActive()) return;

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
  if (isEasterEggActive()) return;
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
