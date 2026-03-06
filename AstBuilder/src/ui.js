import { state, formatPrice } from './state.js';
import { buildSummary, getAffordableThreshold, getLoadWarningText } from './calculations.js';
import { getMatchingExampleImages } from './data.js';
import { el, clearChildren } from './dom.js';

let elements = {};
let conveyorScrollInterval = null;
let isDragging = false;

// ── Initialization ──────────────────────────────────────────────

export function initElements() {
  elements = {
    telescopeSelect: document.getElementById('telescope-select'),
    mountSelect: document.getElementById('mount-select'),
    cameraSelect: document.getElementById('camera-select'),
    telescopeVideo: document.getElementById('telescope-video'),
    mountVideo: document.getElementById('mount-video'),
    cameraVideo: document.getElementById('camera-video'),
    telescopePlaceholder: document.getElementById('telescope-placeholder'),
    mountPlaceholder: document.getElementById('mount-placeholder'),
    cameraPlaceholder: document.getElementById('camera-placeholder'),
    telescopeBuyBtn: document.getElementById('telescope-buy-btn'),
    mountBuyBtn: document.getElementById('mount-buy-btn'),
    cameraBuyBtn: document.getElementById('camera-buy-btn'),
    summarySection: document.getElementById('summary-section'),
    totalPrice: document.getElementById('total-price'),
    fovContent: document.getElementById('fov-content'),
    loadContent: document.getElementById('load-content'),
    buyNowBtn: document.getElementById('buy-now-btn'),
    buyNote: document.getElementById('buy-note'),
    errorMessage: document.getElementById('error-message'),

    budgetSlider: document.getElementById('budget-slider'),
    budgetDisplay: document.getElementById('budget-display'),
    randomBtn: document.getElementById('random-btn'),
    shareBtn: document.getElementById('share-btn'),
    exampleImagesSection: document.getElementById('example-images-section'),
    imageGallery: document.getElementById('image-gallery'),
    conveyorSection: document.getElementById('conveyor-section'),
    conveyorTrack: document.getElementById('conveyor-track'),
    telescopeSpecs: document.getElementById('telescope-specs'),
    mountSpecs: document.getElementById('mount-specs'),
    cameraSpecs: document.getElementById('camera-specs'),
    imageModal: document.getElementById('image-modal'),
    modalImage: document.getElementById('modal-image'),
    modalFilename: document.getElementById('modal-filename'),
    modalClose: document.getElementById('modal-close'),
    modalBackdrop: document.getElementById('modal-backdrop'),
  };
  return elements;
}

export function getElements() {
  return elements;
}

// ── Dropdown population ─────────────────────────────────────────

export function populateDropdowns() {
  if (!state.productsData) return;
  const sel = state.currentSelections;

  // Calculate affordable threshold for each category (maximum price before exceeding budget)
  const telescopeThreshold = getAffordableThreshold('telescope', sel, state.currentBudget);
  const mountThreshold = getAffordableThreshold('mount', sel, state.currentBudget);
  const cameraThreshold = getAffordableThreshold('camera', sel, state.currentBudget);

  // Show ALL products, but highlight over-budget ones
  populateSelect(elements.telescopeSelect, state.productsData.telescopes, telescopeThreshold);
  populateSelect(elements.mountSelect, state.productsData.mounts, mountThreshold);
  populateSelect(elements.cameraSelect, state.productsData.cameras, cameraThreshold);

  // Restore current selections
  if (sel.telescope) elements.telescopeSelect.value = sel.telescope.id;
  if (sel.mount) elements.mountSelect.value = sel.mount.id;
  if (sel.camera) elements.cameraSelect.value = sel.camera.id;
}

/**
 * Populate a select element with all products.
 * Items over the affordable threshold are colored orange to indicate over-budget.
 * @param {HTMLSelectElement} selectEl - The select element to populate
 * @param {Array} products - All product objects for this category
 * @param {number} affordableThreshold - Max price before exceeding budget (for highlighting)
 */
function populateSelect(selectEl, products, affordableThreshold) {
  while (selectEl.options.length > 1) selectEl.remove(1);

  for (const p of products) {
    const opt = document.createElement('option');
    opt.value = p.id;

    // Check if this option would exceed the affordable budget
    const isOverBudget = p.price > affordableThreshold;

    // Build option text with optional over-budget indicator
    opt.textContent = `${p.name} - ${formatPrice(p.price)}`;
    if (isOverBudget) {
      opt.textContent = `⚠ ${opt.textContent}`;
      // Color over-budget options orange for visual distinction
      opt.style.color = '#f97316';
    }

    selectEl.appendChild(opt);
  }
}

// ── Video preview ───────────────────────────────────────────────

export function updateVideoPreview(category, product) {
  const video = elements[`${category}Video`];
  const placeholder = elements[`${category}Placeholder`];
  const buyBtn = elements[`${category}BuyBtn`];

  state.videoReadyStates[category] = false;
  cleanupVideoListeners(video);

  if (product.video) {
    video.src = product.video;
    video.style.display = 'block';
    placeholder.style.display = 'none';
    video.removeAttribute('loop');

    video.onerror = () => {
      video.style.display = 'none';
      placeholder.style.display = 'none';
      state.videoReadyStates[category] = true;
      checkAndPlayAllVideos();
    };

    const onReady = () => {
      state.videoReadyStates[category] = true;
      checkAndPlayAllVideos();
    };
    video.addEventListener('canplaythrough', onReady, { once: true });
    video._onReady = onReady;

    const onHover = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };
    video.addEventListener('mouseenter', onHover);
    video._onHover = onHover;
  } else {
    video.style.display = 'none';
    placeholder.style.display = 'none';
    state.videoReadyStates[category] = true;
    checkAndPlayAllVideos();
  }

  if (buyBtn) {
    if (product.affiliateUrl) {
      buyBtn.href = product.affiliateUrl;
      buyBtn.style.display = 'inline-block';
    } else {
      buyBtn.style.display = 'none';
    }
  }
}

export function clearVideoPreview(category) {
  const video = elements[`${category}Video`];
  const placeholder = elements[`${category}Placeholder`];

  cleanupVideoListeners(video);
  state.videoReadyStates[category] = true;

  video.style.display = 'none';
  video.src = '';
  placeholder.style.display = 'flex';
  placeholder.textContent = `Select a ${category} to see preview`;
  placeholder.className = 'placeholder';
  checkAndPlayAllVideos();
}

function cleanupVideoListeners(video) {
  if (video._onHover) {
    video.removeEventListener('mouseenter', video._onHover);
    video._onHover = null;
  }
  if (video._onReady) {
    video.removeEventListener('canplaythrough', video._onReady);
    video._onReady = null;
  }
}

function checkAndPlayAllVideos() {
  if (!Object.values(state.videoReadyStates).every(Boolean)) return;
  for (const cat of ['telescope', 'mount', 'camera']) {
    const v = elements[`${cat}Video`];
    if (v && v.src && v.style.display !== 'none') {
      v.play().catch(() => {});
    }
  }
}

// ── Summary section ─────────────────────────────────────────────

export function updateSummary() {
  const { telescope, mount, camera } = state.currentSelections;
  if (telescope && mount && camera) {
    elements.summarySection.style.display = 'block';
    elements.conveyorSection.style.display = 'block';
    updateTotalCost();
    updateCalcs();
    updateSpecs();
    updateBuyButton();
    updateExampleImages();
    updateConveyorMatches();
  } else {
    elements.summarySection.style.display = 'none';
    elements.conveyorSection.style.display = 'none';
    elements.exampleImagesSection.style.display = 'none';
  }
}

function updateTotalCost() {
  const { telescope, mount, camera } = state.currentSelections;
  elements.totalPrice.textContent = formatPrice(telescope.price + mount.price + camera.price);
}

function updateCalcs() {
  const { telescope, mount, camera } = state.currentSelections;
  const b = buildSummary(telescope, mount, camera);

  clearChildren(elements.fovContent);
  elements.fovContent.appendChild(
    el('p', {}, `Effective Focal Length: ${b.optics.flEffMm} mm | f/${b.optics.fEff}`)
  );
  elements.fovContent.appendChild(
    el('p', {}, `Effective FOV: ${b.fov.fovWDeg}\u00b0 \u00d7 ${b.fov.fovHDeg}\u00b0 (Sensor: ${b.sensor.sensorWMm.toFixed(1)} \u00d7 ${b.sensor.sensorHMm.toFixed(1)} mm)`)
  );

  const color = b.load.statusColor;
  const warning = getLoadWarningText(color);
  clearChildren(elements.loadContent);
  elements.loadContent.appendChild(
    el('p', { style: { color } }, `Safe Load: ${b.load.payloadUsedKg} kg used of ${b.load.capacityKg} kg (${b.load.utilPct}%)`)
  );
  if (warning) {
    elements.loadContent.appendChild(
      el('p', { style: { color, fontSize: '0.9em', fontStyle: 'italic' } }, warning)
    );
  }
}

function updateSpecs() {
  const { telescope, mount, camera } = state.currentSelections;
  renderSpecCol(elements.telescopeSpecs, telescope, [
    { key: 'aperture_mm', label: 'Aperture', unit: 'mm' },
    { key: 'focal_length_mm', label: 'Focal Length', unit: 'mm' },
    { key: 'f_ratio', label: 'F-Ratio', unit: '' },
    { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  ]);
  renderSpecCol(elements.mountSpecs, mount, [
    { key: 'payload_kg', label: 'Payload Capacity', unit: 'kg' },
    { key: 'weight_kg', label: 'Weight', unit: 'kg' },
  ]);
  renderSpecCol(elements.cameraSpecs, camera, [
    { key: 'sensor', label: 'Sensor', unit: '' },
    { key: 'resolution_mp', label: 'Resolution', unit: 'MP' },
    { key: 'pixel_size_um', label: 'Pixel Size', unit: '\u03bcm' },
  ]);
}

function renderSpecCol(col, product, fields) {
  const content = col.querySelector('.spec-column-content');
  clearChildren(content);
  content.appendChild(
    el('p', { className: 'product-name', style: { marginBottom: '12px', fontWeight: '600', color: '#e8edf3' } }, product.name)
  );
  for (const f of fields) {
    const val = product.specs[f.key];
    if (val != null) {
      const display = f.unit ? `${val} ${f.unit}` : String(val);
      content.appendChild(
        el('p', {},
          el('span', { className: 'spec-label' }, `${f.label}:`),
          el('span', { className: 'spec-value' }, display)
        )
      );
    }
  }
}

function updateBuyButton() {
  const { telescope, mount, camera } = state.currentSelections;
  const hasAll = telescope.affiliateUrl && mount.affiliateUrl && camera.affiliateUrl;
  elements.buyNowBtn.disabled = !hasAll;
  elements.buyNote.style.display = hasAll ? 'none' : 'block';
}

// ── Example images ──────────────────────────────────────────────

function updateExampleImages() {
  const { telescope, camera } = state.currentSelections;
  if (!state.exampleImagesData || !telescope || !camera) {
    elements.exampleImagesSection.style.display = 'none';
    return;
  }
  const matching = getMatchingExampleImages(telescope.name, camera.name);
  if (!matching.length) {
    elements.exampleImagesSection.style.display = 'none';
    return;
  }
  elements.exampleImagesSection.style.display = 'block';
  const picked = [...matching].sort(() => Math.random() - 0.5).slice(0, 3);

  clearChildren(elements.imageGallery);
  for (const img of picked) {
    elements.imageGallery.appendChild(
      el('div', { className: 'gallery-item' },
        el('img', { src: `images/examples/${img.filename}`, alt: img.object, loading: 'lazy' }),
        el('p', { className: 'image-caption' }, img.object)
      )
    );
  }
}

// ── Conveyor belt (JS-driven scroll, no CSS animation) ──────────

export function populateConveyorBelt() {
  if (!state.exampleImagesData || !elements.conveyorTrack) return;
  clearChildren(elements.conveyorTrack);

  const allImages = [...state.exampleImagesData, ...state.exampleImagesData];
  for (const img of allImages) {
    const thumb = el('div', { className: 'conveyor-thumbnail', tabindex: '0', role: 'button', 'aria-label': `View ${img.object}`, title: img.original_filename || img.filename },
      el('img', { src: `images/examples/${img.filename}`, alt: img.object, loading: 'lazy' }),
      el('div', { className: 'conveyor-filename' }, img.original_filename || img.filename)
    );
    thumb.dataset.telescope = img.telescope;
    thumb.dataset.camera = img.camera;
    thumb.addEventListener('click', () => openModal(img));
    thumb.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(img); }
    });
    elements.conveyorTrack.appendChild(thumb);
  }

  startConveyorAutoScroll();
  setupConveyorDragScroll();
  updateConveyorMatches();
}

function startConveyorAutoScroll() {
  const container = document.querySelector('.conveyor-container');
  if (!container) return;
  if (conveyorScrollInterval) clearInterval(conveyorScrollInterval);

  conveyorScrollInterval = setInterval(() => {
    if (isDragging) return;
    container.scrollLeft += 1;
    if (container.scrollLeft >= container.scrollWidth / 2) {
      container.scrollLeft = 0;
    }
  }, 30);
}

function setupConveyorDragScroll() {
  const container = document.querySelector('.conveyor-container');
  if (!container) return;
  let startX, scrollLeft;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    container.style.cursor = 'grabbing';
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });
  container.addEventListener('mouseleave', () => { isDragging = false; container.style.cursor = 'grab'; });
  container.addEventListener('mouseup', () => { isDragging = false; container.style.cursor = 'grab'; });
  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    container.scrollLeft = scrollLeft - (e.pageX - container.offsetLeft - startX) * 2;
  });

  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });
  container.addEventListener('touchmove', (e) => {
    container.scrollLeft = scrollLeft - (e.touches[0].pageX - container.offsetLeft - startX) * 2;
  });
  container.addEventListener('touchend', () => { isDragging = false; });
}

export function updateConveyorMatches() {
  if (!elements.conveyorTrack) return;
  const selTelescope = state.currentSelections.telescope?.name;
  const selCamera = state.currentSelections.camera?.name;
  for (const thumb of elements.conveyorTrack.querySelectorAll('.conveyor-thumbnail')) {
    const matches = (selTelescope && thumb.dataset.telescope === selTelescope) ||
                    (selCamera && thumb.dataset.camera === selCamera);
    thumb.classList.toggle('matches-gear', matches);
  }
}


export function updateBudgetDisplay() {
  elements.budgetDisplay.textContent = formatPrice(state.currentBudget);
}

// ── Modal ───────────────────────────────────────────────────────

function openModal(imageData) {
  if (!elements.imageModal) return;
  elements.modalImage.src = `images/examples/${imageData.filename}`;
  elements.modalImage.alt = imageData.object;
  elements.modalFilename.textContent = imageData.original_filename || imageData.filename;
  elements.imageModal.style.display = 'flex';
  elements.modalClose.focus();
}

export function closeModal() {
  if (!elements.imageModal) return;
  elements.imageModal.style.display = 'none';
}

// ── Error ───────────────────────────────────────────────────────

export function showError() {
  elements.errorMessage.style.display = 'block';
  document.querySelector('.configuration').style.display = 'none';
  document.querySelector('.previews').style.display = 'none';
  elements.summarySection.style.display = 'none';
}

// ── Share rig screenshot ────────────────────────────────────────

export async function handleShareRig() {
  const { telescope, mount, camera } = state.currentSelections;
  if (!telescope || !mount || !camera) {
    alert('Please select a telescope, mount, and camera before sharing your rig.');
    return;
  }

  const html2canvas = (await import('html2canvas')).default;
  const origText = elements.shareBtn.textContent;

  try {
    elements.shareBtn.textContent = '\ud83d\udcf8 Capturing...';
    elements.shareBtn.disabled = true;

    // Capture video frames
    const frames = {};
    for (const cat of ['telescope', 'mount', 'camera']) {
      const v = elements[`${cat}Video`];
      if (v && v.readyState >= 2 && v.videoWidth > 0) {
        const c = document.createElement('canvas');
        c.width = v.videoWidth || 640;
        c.height = v.videoHeight || 360;
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        frames[cat] = c.toDataURL('image/png');
      }
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;background:#1a2845;padding:30px;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;width:1000px;';

    // Header grid
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    header.appendChild(buildText('h2', 'My Astrophotography Rig', 'color:white;text-align:center;margin-bottom:20px;font-size:24px;'));

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:15px;margin-bottom:20px;';
    const items = [
      { emoji: '\ud83d\udd2d', label: 'Telescope', sel: telescope },
      { emoji: '\ud83e\udd16', label: 'Mount', sel: mount },
      { emoji: '\ud83d\udcf7', label: 'Camera', sel: camera },
    ];
    for (const it of items) {
      const card = document.createElement('div');
      card.style.cssText = 'background:rgba(35,55,85,.7);padding:15px;border-radius:8px;text-align:center;';
      card.appendChild(buildText('div', `${it.emoji} ${it.label}`, 'color:#5a9fd4;font-weight:600;margin-bottom:5px;'));
      card.appendChild(buildText('div', it.sel.name, 'color:white;font-size:14px;'));
      card.appendChild(buildText('div', formatPrice(it.sel.price), 'color:#8ab4d4;font-size:16px;font-weight:600;margin-top:5px;'));
      grid.appendChild(card);
    }
    header.appendChild(grid);
    wrapper.appendChild(header);

    // Preview panels
    const previews = document.createElement('div');
    previews.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:20px;';
    const panels = [
      { frame: frames.telescope, label: 'Telescope Preview', sel: telescope, emoji: '\ud83d\udd2d' },
      { frame: frames.mount, label: 'Mount Preview', sel: mount, emoji: '\ud83e\udd16' },
      { frame: frames.camera, label: 'Camera Preview', sel: camera, emoji: '\ud83d\udcf7' },
    ];
    for (const p of panels) {
      const panel = document.createElement('div');
      panel.style.cssText = 'background:rgba(20,30,45,.7);border-radius:8px;padding:15px;text-align:center;';
      panel.appendChild(buildText('h3', p.label, 'color:white;font-size:16px;margin-bottom:10px;'));
      if (p.frame) {
        const img = document.createElement('img');
        img.src = p.frame;
        img.style.cssText = 'width:100%;height:auto;border-radius:4px;background:#0a1628;';
        panel.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.style.cssText = 'width:100%;min-height:180px;background:linear-gradient(135deg,#0a1628,#1a2845);border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;color:#5a9fd4;';
        ph.appendChild(buildText('div', p.emoji, 'font-size:48px;margin-bottom:10px;'));
        ph.appendChild(buildText('div', p.sel.name, 'color:white;font-size:13px;text-align:center;font-weight:600;'));
        panel.appendChild(ph);
      }
      previews.appendChild(panel);
    }
    wrapper.appendChild(previews);

    // Footer total
    const footer = document.createElement('div');
    footer.style.cssText = 'background:rgba(35,55,85,.9);padding:20px;border-radius:8px;text-align:center;';
    footer.appendChild(buildText('div', 'Total Cost', 'color:#5a9fd4;font-weight:600;font-size:18px;margin-bottom:5px;'));
    footer.appendChild(buildText('div', formatPrice(telescope.price + mount.price + camera.price), 'color:white;font-size:28px;font-weight:700;'));
    wrapper.appendChild(footer);

    document.body.appendChild(wrapper);
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(wrapper, { backgroundColor: '#1a2845', scale: 2, logging: false, useCORS: true, allowTaint: true });
    document.body.removeChild(wrapper);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `my-astro-rig-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      elements.shareBtn.textContent = origText;
      elements.shareBtn.disabled = false;
    }, 'image/png');
  } catch (err) {
    console.error('Error capturing screenshot:', err);
    alert('Failed to capture screenshot. Please try again.');
    elements.shareBtn.textContent = origText;
    elements.shareBtn.disabled = false;
  }
}

/** Safe text-node element builder for the share screenshot. */
function buildText(tag, text, css) {
  const node = document.createElement(tag);
  node.style.cssText = css;
  node.textContent = text;
  return node;
}
