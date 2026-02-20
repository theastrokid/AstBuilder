/**
 * app.js — Custom Star Map application controller
 * Three-step wizard: Format → Personalize → Finish
 */

(function () {
  'use strict';

  // ══ Default state ═════════════════════════════════════════════════
  const DEFAULT_STATE = {
    // Step 1 — Format
    preset:         'midnight-classic',
    size:           '18x24',
    orientation:    'portrait',
    theme:          'midnight-blue',
    font:           'cinzel-garamond',
    border:         'none',
    starStyle:      'realistic',
    mapCenter:      'zenith',
    showConstLines: true,
    showConstNames: true,
    showStarNames:  false,
    showGrid:       false,
    showCardinals:  true,
    showEcliptic:   false,
    showMilkyWay:   true,
    showFaintStars: false,

    // Step 2 — Personalize
    title:          'The Night We Met',
    subtitle:       '',
    date:           today(),
    time:           '22:00',
    timeMode:       'exact',
    tzOffset:       -new Date().getTimezoneOffset() / 60,
    lat:            40.7128,
    lon:            -74.0060,
    locationName:   'New York, NY',
    showCoords:     true,
    showDate:       true,
    showSciFooter:  false,
    showPlanets:    false,
    showSkyConditions: false,
    showDsoFooter:  true,
    showQR:         false,

    // DSO
    dsoSeed:        1,
    dsoStrictVisibility: false,
    dsos:           [],

    // Internal
    qrDataUrl:      null,
  };

  let state = { ...DEFAULT_STATE };
  let dsoDb  = null;
  let renderTimer = null;
  let currentStep = 1;
  let zoomLevel   = 1;

  // ══ Boot ══════════════════════════════════════════════════════════
  function init() {
    populateTimezones();
    setDefaultDate();
    loadDSOCatalog();
    bindAllEvents();

    // Restore from URL if share link
    const shared = StarExport.parseShareURL();
    if (shared) {
      Object.assign(state, shared);
      applyStateToUI();
    }

    goToStep(1);
    scheduleRender();
  }

  // ── Today string ─────────────────────────────────────────────────
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Default date to today ─────────────────────────────────────────
  function setDefaultDate() {
    const d = document.getElementById('input-date');
    if (d) d.value = state.date;
    const t = document.getElementById('input-time');
    if (t) t.value = state.time;
  }

  // ── Populate timezone select ───────────────────────────────────────
  function populateTimezones() {
    const sel = document.getElementById('timezone-select');
    if (!sel) return;
    const tzNames = Intl.supportedValuesOf
      ? Intl.supportedValuesOf('timeZone')
      : ['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
         'Europe/London','Europe/Paris','Europe/Berlin','Asia/Tokyo','Asia/Shanghai',
         'Australia/Sydney','Pacific/Auckland'];

    // Try to detect local timezone
    let localTZ = '';
    try { localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) {}

    for (const tz of tzNames) {
      const opt = document.createElement('option');
      opt.value = tz;
      opt.textContent = tz.replace(/_/g, ' ');
      if (tz === localTZ) opt.selected = true;
      sel.appendChild(opt);
    }

    sel.addEventListener('change', () => {
      updateTZOffset(sel.value, state.date, state.time);
      scheduleRender();
    });

    updateTZOffset(localTZ || 'UTC', state.date, state.time);
  }

  function updateTZOffset(tzName, dateStr, timeStr) {
    try {
      const dt = new Date(`${dateStr || today()}T${timeStr || '22:00'}:00`);
      const localStr = dt.toLocaleString('en-US', { timeZone: tzName, timeZoneName: 'short' });
      // Compute offset via formatter trick
      const utcDate = new Date(dt.toLocaleString('en-US', { timeZone: 'UTC' }));
      const tzDate  = new Date(dt.toLocaleString('en-US', { timeZone: tzName }));
      const offset  = (tzDate - utcDate) / 3600000;
      state.tzOffset = offset;
    } catch(e) {
      state.tzOffset = -new Date().getTimezoneOffset() / 60;
    }
  }

  // ══ DSO Catalog ═══════════════════════════════════════════════════
  function loadDSOCatalog() {
    fetch('data/dso.json')
      .then(r => r.json())
      .then(data => {
        dsoDb = data;
        pickDSOs();
        scheduleRender();
      })
      .catch(e => {
        console.warn('DSO catalog not loaded:', e);
      });
  }

  // ── Seeded RNG (Mulberry32) ───────────────────────────────────────
  function seededRNG(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function pickDSOs() {
    if (!dsoDb) { state.dsos = []; return; }

    const date  = state.date || today();
    const month = parseInt(date.split('-')[1], 10);

    // Get month batch
    const monthKey   = String(month);
    const batchIds   = (dsoDb.monthlyBest || {})[monthKey] || [];
    const catalog    = dsoDb.catalog || [];
    const catalogMap = new Map(catalog.map(d => [d.id, d]));

    // Seeded RNG — seed from date + location hash + title + dsoSeed
    const seedStr = `${date}|${state.lat}|${state.lon}|${state.title}|${state.dsoSeed}`;
    let seedNum = 0;
    for (let i = 0; i < seedStr.length; i++) seedNum = (seedNum * 31 + seedStr.charCodeAt(i)) >>> 0;
    const rng = seededRNG(seedNum);

    // Shuffle batch
    const batch = [...batchIds].map(id => catalogMap.get(id)).filter(Boolean);
    for (let i = batch.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [batch[i], batch[j]] = [batch[j], batch[i]];
    }

    // Select 5
    const dateObj = StarMap.buildDateObject(state);
    const lat = parseFloat(state.lat) || 40;
    const lon = parseFloat(state.lon) || -74;

    let selected = [];
    const rejects = [];

    for (const dso of batch) {
      if (selected.length >= 5) break;
      const vis = AstroCalc.dsoVisibility(dso.ra, dso.dec, dateObj, lat, lon);
      dso._visibility = vis;

      if (state.dsoStrictVisibility && !vis.ok && !vis.low) {
        rejects.push(dso);
      } else {
        selected.push(dso);
      }
    }

    // Fill from remaining if strict
    if (state.dsoStrictVisibility && selected.length < 5) {
      // Try non-batch catalog
      const remaining = catalog.filter(d =>
        !batchIds.includes(d.id) && !selected.find(s => s.id === d.id)
      );
      remaining.sort(() => rng() - 0.5);
      for (const dso of remaining) {
        if (selected.length >= 5) break;
        const vis = AstroCalc.dsoVisibility(dso.ra, dso.dec, dateObj, lat, lon);
        dso._visibility = vis;
        if (vis.ok) selected.push(dso);
      }
    }

    // Pad to 5 with rejects if needed
    while (selected.length < 5 && rejects.length > 0) {
      selected.push(rejects.shift());
    }

    state.dsos = selected.slice(0, 5);
    renderDSOCards();
  }

  // ── Render DSO cards (Step 3 UI) ──────────────────────────────────
  function renderDSOCards() {
    const container = document.getElementById('dso-cards');
    if (!container) return;
    container.innerHTML = '';

    if (!state.dsos || state.dsos.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:12px">No DSO catalog loaded.</p>';
      return;
    }

    for (const dso of state.dsos) {
      const card = document.createElement('div');
      card.className = 'dso-card';
      const vis = dso._visibility;
      if (vis) {
        if (vis.twilight) card.classList.add('twilight');
        else if (vis.low)  card.classList.add('low-sky');
      }

      const typeLabel = formatDSOType(dso.type);
      const badgeText = vis
        ? (vis.twilight ? '⊙ Twilight' : vis.ok ? '● Visible' : vis.low ? '◌ Low' : '✗ Below horizon')
        : '';
      const badgeColor = vis
        ? (vis.twilight ? '#ff6060' : vis.ok ? '#4cce94' : vis.low ? '#ffaa00' : '#888')
        : '#888';

      card.innerHTML = `
        <div class="dso-thumb">
          <img src="${dso.thumbnailPath || 'assets/dso_thumbs/galaxy_spiral.svg'}"
               alt="${dso.name}" onerror="this.src='assets/dso_thumbs/galaxy_spiral.svg'"/>
        </div>
        <div class="dso-card-name">${dso.name || dso.id}</div>
        <div class="dso-card-type">${typeLabel}</div>
        ${badgeText ? `<div class="dso-card-badge" style="color:${badgeColor}">${badgeText}</div>` : ''}
      `;

      card.addEventListener('click', () => showDSOModal(dso));
      container.appendChild(card);
    }
  }

  function formatDSOType(t) {
    const map = {
      'galaxy': 'Galaxy', 'nebula': 'Nebula', 'open_cluster': 'Open Cluster',
      'globular_cluster': 'Glob. Cluster', 'planetary_nebula': 'Plan. Nebula',
      'supernova_remnant': 'Sup. Remnant', 'double_star': 'Double Star',
      'asterism': 'Asterism'
    };
    return map[t] || t || 'Object';
  }

  // ── DSO modal ─────────────────────────────────────────────────────
  function showDSOModal(dso) {
    const modal   = document.getElementById('dso-modal');
    const content = document.getElementById('dso-modal-content');
    if (!modal || !content) return;

    const vis = dso._visibility;
    const visClass = vis
      ? (vis.twilight ? 'vis-twilight' : vis.ok ? 'vis-ok' : vis.low ? 'vis-low' : '')
      : '';
    const visText = vis
      ? (vis.twilight ? '⊙ During twilight — sky not fully dark'
         : vis.ok  ? `● Altitude: ${vis.alt.toFixed(1)}° — well placed`
         : vis.low ? `◌ Altitude: ${vis.alt.toFixed(1)}° — low on horizon`
         : `✗ Below horizon (${vis.alt.toFixed(1)}°)`)
      : '';

    const ra_h = dso.ra || 0;
    const raStr = `${Math.floor(ra_h)}h ${Math.round((ra_h % 1) * 60)}m`;
    const dec = dso.dec || 0;
    const decStr = `${dec >= 0 ? '+' : ''}${dec.toFixed(1)}°`;

    content.innerHTML = `
      <h3>${dso.name || dso.id}</h3>
      <div class="dso-modal-type">${formatDSOType(dso.type)} · ${dso.constellation || ''}</div>
      <div class="dso-modal-thumb">
        <img src="${dso.thumbnailPath || 'assets/dso_thumbs/galaxy_spiral.svg'}"
             alt="${dso.name}"
             onerror="this.src='assets/dso_thumbs/galaxy_spiral.svg'"/>
      </div>
      <div class="dso-modal-facts">
        <div class="fact-item">
          <div class="fact-label">Magnitude</div>
          <div class="fact-val">${dso.magnitude != null ? dso.magnitude.toFixed(1) : '—'}</div>
        </div>
        <div class="fact-item">
          <div class="fact-label">Size</div>
          <div class="fact-val">${dso.size ? dso.size + '\'' : '—'}</div>
        </div>
        <div class="fact-item">
          <div class="fact-label">RA</div>
          <div class="fact-val">${raStr}</div>
        </div>
        <div class="fact-item">
          <div class="fact-label">Dec</div>
          <div class="fact-val">${decStr}</div>
        </div>
      </div>
      ${dso.funFact ? `<div class="dso-funfact">${dso.funFact}</div>` : ''}
      ${visText ? `<div class="dso-visibility ${visClass}" style="margin-top:10px">${visText}</div>` : ''}
    `;

    modal.classList.remove('hidden');
  }

  // ══ Wizard Navigation ══════════════════════════════════════════════
  function goToStep(n) {
    currentStep = n;
    document.querySelectorAll('.wizard-section').forEach(s => {
      s.classList.toggle('hidden', parseInt(s.dataset.step) !== n);
    });
    document.querySelectorAll('.wizard-step').forEach(s => {
      const sn = parseInt(s.dataset.step);
      s.classList.toggle('active', sn === n);
      s.classList.toggle('completed', sn < n);
    });

    // Update share URL and QR on step 3
    if (n === 3) {
      pickDSOs();
      updateShareLink();
    }

    // Scroll controls to top
    const panel = document.getElementById('controls-panel');
    if (panel) panel.scrollTop = 0;
  }

  // ── Share link ───────────────────────────────────────────────────
  function updateShareLink() {
    const url = StarExport.buildShareURL(state);
    const inp = document.getElementById('share-url');
    if (inp) inp.value = url;

    if (state.showQR) {
      const canvas = document.getElementById('qr-preview');
      StarExport.renderQRToCanvas(url, canvas);
    }
  }

  // ── Toast ────────────────────────────────────────────────────────
  function showToast(msg, dur) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add('hidden'), dur || 2500);
  }

  // ══ Rendering ══════════════════════════════════════════════════════
  function scheduleRender(delay) {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(doRender, delay || 80);
  }

  function doRender() {
    const loading = document.getElementById('preview-loading');
    if (loading) loading.classList.remove('hidden');

    // Yield to browser to show loading indicator
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const svgStr = StarMap.render(state);
          const container = document.getElementById('starmap-container');
          if (container) container.innerHTML = svgStr;
          updatePaperSize();
        } catch (e) {
          console.error('Render error:', e);
        }
        if (loading) loading.classList.add('hidden');
      }, 10);
    });
  }

  // ── Size the preview paper element ───────────────────────────────
  function updatePaperSize() {
    const paper   = document.getElementById('preview-paper');
    const viewport = document.getElementById('preview-viewport');
    if (!paper || !viewport) return;

    const SIZES = StarMap.PAPER_SIZES;
    const sizeKey = state.size || '18x24';
    let { w, h } = SIZES[sizeKey] || { w: 457.2, h: 609.6 };
    if (state.orientation === 'landscape') { [w, h] = [h, w]; }

    // Scale to fit viewport with current zoom
    const vw = viewport.clientWidth - 64;
    const vh = viewport.clientHeight - 64;
    const fitScale = Math.min(vw / w, vh / h, 1);
    const scale = fitScale * zoomLevel;

    paper.style.width  = `${w}mm`;
    paper.style.height = `${h}mm`;
    paper.style.transform = `scale(${scale})`;
    paper.style.transformOrigin = 'top center';

    const pct = Math.round(scale * 100);
    const zl = document.getElementById('zoom-level');
    if (zl) zl.textContent = `${pct}%`;
  }

  // ══ Event Binding ══════════════════════════════════════════════════
  function bindAllEvents() {

    // Wizard step buttons
    document.querySelectorAll('.wizard-step').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = parseInt(btn.dataset.step);
        if (n <= currentStep || n === currentStep + 1) goToStep(n);
      });
    });

    // Next/Back buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
      btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.to)));
    });
    document.querySelectorAll('.btn-back').forEach(btn => {
      btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.to)));
    });

    // ── Step 1: Format controls ────────────────────────────────────

    // Presets
    document.querySelectorAll('.preset-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        applyPreset(card.dataset.preset);
      });
    });

    // Print size
    document.querySelectorAll('input[name="size"]').forEach(r => {
      r.addEventListener('change', () => { state.size = r.value; scheduleRender(); });
    });

    // Orientation
    document.getElementById('btn-portrait')?.addEventListener('click', () => {
      state.orientation = 'portrait';
      toggleActive('btn-portrait','btn-landscape');
      scheduleRender();
    });
    document.getElementById('btn-landscape')?.addEventListener('click', () => {
      state.orientation = 'landscape';
      toggleActive('btn-landscape','btn-portrait');
      scheduleRender();
    });

    // Theme
    document.getElementById('theme-select')?.addEventListener('change', e => {
      state.theme = e.target.value;
      scheduleRender();
    });

    // Font
    document.querySelectorAll('input[name="font"]').forEach(r => {
      r.addEventListener('change', () => { state.font = r.value; scheduleRender(); });
    });

    // Border
    ['none','thin','thick','double'].forEach(b => {
      document.getElementById(`border-${b}`)?.addEventListener('click', () => {
        state.border = b;
        document.querySelectorAll('[data-border]').forEach(el => el.classList.remove('active'));
        document.getElementById(`border-${b}`)?.classList.add('active');
        scheduleRender();
      });
    });

    // Star style
    document.querySelectorAll('input[name="starStyle"]').forEach(r => {
      r.addEventListener('change', () => { state.starStyle = r.value; scheduleRender(); });
    });

    // Map center
    document.getElementById('map-center')?.addEventListener('change', e => {
      state.mapCenter = e.target.value;
      scheduleRender();
    });

    // Toggle checkboxes
    const toggleMap = {
      'tog-constellation-lines': 'showConstLines',
      'tog-constellation-names': 'showConstNames',
      'tog-star-names':          'showStarNames',
      'tog-grid':                'showGrid',
      'tog-cardinals':           'showCardinals',
      'tog-ecliptic':            'showEcliptic',
      'tog-milkyway':            'showMilkyWay',
      'tog-magnitude-limit':     'showFaintStars',
      'tog-show-coords':         'showCoords',
      'tog-show-date':           'showDate',
      'tog-sci-footer':          'showSciFooter',
      'tog-planets':             'showPlanets',
      'tog-sky-conditions':      'showSkyConditions',
      'tog-dso-footer':          'showDsoFooter',
      'tog-qr':                  'showQR',
      'tog-strict-visibility':   'dsoStrictVisibility',
    };

    for (const [id, key] of Object.entries(toggleMap)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.checked = !!state[key];
      el.addEventListener('change', () => {
        state[key] = el.checked;
        if (key === 'showQR') updateShareLink();
        if (key === 'dsoStrictVisibility') { pickDSOs(); }
        scheduleRender();
      });
    }

    // ── Step 2: Personalize controls ────────────────────────────────

    textBind('input-title',    'title');
    textBind('input-subtitle', 'subtitle');

    document.getElementById('input-date')?.addEventListener('change', e => {
      state.date = e.target.value;
      const tzSel = document.getElementById('timezone-select');
      if (tzSel) updateTZOffset(tzSel.value, state.date, state.time);
      pickDSOs();
      scheduleRender();
    });

    document.getElementById('input-time')?.addEventListener('change', e => {
      state.time = e.target.value;
      const tzSel = document.getElementById('timezone-select');
      if (tzSel) updateTZOffset(tzSel.value, state.date, state.time);
      scheduleRender();
    });

    // Time mode
    document.querySelectorAll('input[name="timeMode"]').forEach(r => {
      r.addEventListener('change', () => {
        state.timeMode = r.value;
        const tg = document.getElementById('time-input-group');
        if (tg) tg.style.opacity = r.value === 'exact' ? '1' : '0.4';
        scheduleRender();
      });
    });

    // Location search (uses geocoding-like approach with nominatim)
    const searchInput = document.getElementById('input-location-search');
    const suggestions = document.getElementById('location-suggestions');

    if (searchInput) {
      let searchTimer;
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        const q = searchInput.value.trim();
        if (q.length < 3) { hideSuggestions(); return; }
        searchTimer = setTimeout(() => searchLocation(q), 400);
      });

      searchInput.addEventListener('blur', () => {
        setTimeout(hideSuggestions, 200);
      });
    }

    // Lat/lon inputs
    document.getElementById('input-lat')?.addEventListener('change', e => {
      state.lat = parseFloat(e.target.value) || state.lat;
      pickDSOs();
      scheduleRender();
    });
    document.getElementById('input-lon')?.addEventListener('change', e => {
      state.lon = parseFloat(e.target.value) || state.lon;
      pickDSOs();
      scheduleRender();
    });

    // "Use my location"
    document.getElementById('btn-locate')?.addEventListener('click', () => {
      if (!navigator.geolocation) { showToast('Geolocation not available'); return; }
      navigator.geolocation.getCurrentPosition(
        pos => {
          state.lat = pos.coords.latitude;
          state.lon = pos.coords.longitude;
          state.locationName = `${state.lat.toFixed(4)}°, ${state.lon.toFixed(4)}°`;
          updateLatLonUI();
          pickDSOs();
          scheduleRender();
          showToast('Location updated');
        },
        () => showToast('Could not get location')
      );
    });

    // ── Step 3 controls ────────────────────────────────────────────

    document.getElementById('btn-shuffle-dso')?.addEventListener('click', () => {
      state.dsoSeed = (state.dsoSeed + 1) % 100;
      pickDSOs();
      scheduleRender();
      showToast('Shuffled deep sky objects');
    });

    document.getElementById('btn-export-svg')?.addEventListener('click', () => {
      const svgStr = StarMap.render(state);
      StarExport.exportSVG(svgStr, buildFilename('svg'));
      showToast('SVG downloaded');
    });

    document.getElementById('btn-export-pdf')?.addEventListener('click', async () => {
      showToast('Generating PDF… this may take a moment');
      const svgStr = StarMap.render(state);
      await StarExport.exportPDF(svgStr, state, buildFilename('pdf'));
    });

    document.getElementById('btn-copy-url')?.addEventListener('click', () => {
      const inp = document.getElementById('share-url');
      if (inp) {
        navigator.clipboard.writeText(inp.value)
          .then(() => showToast('Share link copied!'))
          .catch(() => { inp.select(); document.execCommand('copy'); showToast('Copied!'); });
      }
    });

    // Top bar
    document.getElementById('btn-share')?.addEventListener('click', () => {
      updateShareLink();
      const inp = document.getElementById('share-url');
      if (inp) {
        navigator.clipboard.writeText(inp.value)
          .then(() => showToast('Share link copied!'))
          .catch(() => showToast('Go to Finish step to copy link'));
      } else {
        showToast('Go to Finish step to copy link');
      }
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (confirm('Reset all settings to defaults?')) {
        state = { ...DEFAULT_STATE };
        applyStateToUI();
        goToStep(1);
        scheduleRender();
        showToast('Reset to defaults');
      }
    });

    // Modal close
    document.getElementById('dso-modal-close')?.addEventListener('click', () => {
      document.getElementById('dso-modal')?.classList.add('hidden');
    });
    document.getElementById('dso-modal')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
    });

    // Zoom
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel * 1.2, 3);
      updatePaperSize();
    });
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel / 1.2, 0.2);
      updatePaperSize();
    });
    document.getElementById('btn-zoom-fit')?.addEventListener('click', () => {
      zoomLevel = 1;
      updatePaperSize();
    });

    // Resize
    window.addEventListener('resize', () => updatePaperSize());

    // Location search suggestions
    if (suggestions) {
      suggestions.addEventListener('click', e => {
        const item = e.target.closest('.suggestion-item');
        if (!item) return;
        state.lat = parseFloat(item.dataset.lat);
        state.lon = parseFloat(item.dataset.lon);
        state.locationName = item.dataset.name;
        updateLatLonUI();
        const si = document.getElementById('input-location-search');
        if (si) si.value = item.dataset.name;
        hideSuggestions();
        pickDSOs();
        scheduleRender();
      });
    }

    // Time mode label active state
    document.querySelectorAll('.time-mode-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.time-mode-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
      });
    });
  }

  // ── Text field binding with debounce ──────────────────────────────
  function textBind(id, key, delay) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = state[key] || '';
    let t;
    el.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        state[key] = el.value;
        scheduleRender();
      }, delay || 200);
    });
  }

  // ── Toggle active button ───────────────────────────────────────────
  function toggleActive(activeId, inactiveId) {
    document.getElementById(activeId)?.classList.add('active');
    document.getElementById(inactiveId)?.classList.remove('active');
  }

  // ── Update lat/lon UI inputs ──────────────────────────────────────
  function updateLatLonUI() {
    const la = document.getElementById('input-lat');
    const lo = document.getElementById('input-lon');
    if (la) la.value = state.lat;
    if (lo) lo.value = state.lon;
  }

  // ── Apply preset to state + UI ────────────────────────────────────
  function applyPreset(presetId) {
    const p = StarMap.PRESETS[presetId];
    if (!p) return;
    state.preset = presetId;
    if (p.theme)         state.theme = p.theme;
    if (p.font)          state.font  = p.font;
    if (p.border)        state.border = p.border;
    if (p.starStyle)     state.starStyle = p.starStyle;
    if (p.showMilkyWay  !== undefined) state.showMilkyWay   = p.showMilkyWay;
    if (p.showGrid      !== undefined) state.showGrid        = p.showGrid;
    if (p.showConstLines!== undefined) state.showConstLines  = p.showConstLines;
    if (p.showConstNames!== undefined) state.showConstNames  = p.showConstNames;
    if (p.showCardinals !== undefined) state.showCardinals   = p.showCardinals;
    applyStateToUI();
    scheduleRender();
  }

  // ── Sync UI controls from state ───────────────────────────────────
  function applyStateToUI() {
    // Preset cards
    document.querySelectorAll('.preset-card').forEach(c => {
      c.classList.toggle('active', c.dataset.preset === state.preset);
    });

    // Size radio
    document.querySelectorAll('input[name="size"]').forEach(r => {
      r.checked = r.value === state.size;
    });

    // Orientation
    toggleActive(
      state.orientation === 'landscape' ? 'btn-landscape' : 'btn-portrait',
      state.orientation === 'landscape' ? 'btn-portrait'  : 'btn-landscape'
    );

    // Theme
    const ts = document.getElementById('theme-select');
    if (ts) ts.value = state.theme;

    // Font
    document.querySelectorAll('input[name="font"]').forEach(r => {
      r.checked = r.value === state.font;
    });

    // Border
    ['none','thin','thick','double'].forEach(b => {
      document.getElementById(`border-${b}`)?.classList.toggle('active', state.border === b);
    });

    // Star style
    document.querySelectorAll('input[name="starStyle"]').forEach(r => {
      r.checked = r.value === state.starStyle;
    });

    // Map center
    const mc = document.getElementById('map-center');
    if (mc) mc.value = state.mapCenter;

    // Checkboxes
    const toggleMap = {
      'tog-constellation-lines': 'showConstLines',
      'tog-constellation-names': 'showConstNames',
      'tog-star-names':          'showStarNames',
      'tog-grid':                'showGrid',
      'tog-cardinals':           'showCardinals',
      'tog-ecliptic':            'showEcliptic',
      'tog-milkyway':            'showMilkyWay',
      'tog-magnitude-limit':     'showFaintStars',
      'tog-show-coords':         'showCoords',
      'tog-show-date':           'showDate',
      'tog-sci-footer':          'showSciFooter',
      'tog-planets':             'showPlanets',
      'tog-sky-conditions':      'showSkyConditions',
      'tog-dso-footer':          'showDsoFooter',
      'tog-qr':                  'showQR',
      'tog-strict-visibility':   'dsoStrictVisibility',
    };
    for (const [id, key] of Object.entries(toggleMap)) {
      const el = document.getElementById(id);
      if (el) el.checked = !!state[key];
    }

    // Text inputs
    const inputTitle = document.getElementById('input-title');
    if (inputTitle) inputTitle.value = state.title || '';
    const inputSub = document.getElementById('input-subtitle');
    if (inputSub) inputSub.value = state.subtitle || '';

    updateLatLonUI();
    const si = document.getElementById('input-location-search');
    if (si && state.locationName) si.value = state.locationName;
  }

  // ── Nominatim location search ─────────────────────────────────────
  function searchLocation(q) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5`;
    fetch(url, { headers: { 'Accept-Language': 'en' } })
      .then(r => r.json())
      .then(results => showSuggestions(results))
      .catch(() => {});
  }

  function showSuggestions(results) {
    const container = document.getElementById('location-suggestions');
    if (!container) return;
    container.innerHTML = '';
    if (!results || results.length === 0) { hideSuggestions(); return; }
    for (const r of results) {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = r.display_name;
      item.dataset.lat  = r.lat;
      item.dataset.lon  = r.lon;
      item.dataset.name = r.display_name.split(',').slice(0, 2).join(',').trim();
      container.appendChild(item);
    }
    container.classList.remove('hidden');
  }

  function hideSuggestions() {
    const container = document.getElementById('location-suggestions');
    if (container) container.classList.add('hidden');
  }

  // ── Build export filename ─────────────────────────────────────────
  function buildFilename(ext) {
    const t = (state.title || 'starmap').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
    const d = (state.date || today()).replace(/-/g, '');
    return `starmap-${t}-${d}.${ext}`;
  }

  // ── Bootstrap ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
