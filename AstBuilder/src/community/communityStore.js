/**
 * Community submissions storage service.
 *
 * Uses localStorage as a fully functional fallback.
 * Structured so a backend (Supabase / Firebase) can be swapped in later
 * by replacing the body of each exported function — the call-sites stay the same.
 *
 * Data shape (submissions):
 *   { id, name, description, screenshot, telescope, mount, camera, totalPrice, createdAt }
 *
 * Ratings are stored separately keyed by rig ID.
 * A per-browser "already rated" flag prevents obvious spam.
 */

const SUBMISSIONS_KEY = 'community_submissions';
const RATINGS_KEY = 'community_ratings';
const RATED_PREFIX = 'community_rated_';
const SEEDED_KEY = 'community_seeded';

// ── Seed preview generator ──────────────────────────────────────

function generateRigPreviewSVG(name, telescope, mount, camera, totalPrice) {
  // Stars as background decoration
  let stars = '';
  const starPositions = [
    [45,25],[180,18],[310,30],[420,15],[520,28],[70,85],[250,70],[380,55],[480,80],
    [130,140],[350,130],[460,145],[60,190],[200,175],[540,170],[100,220],[300,200],[440,215],
  ];
  for (const [sx, sy] of starPositions) {
    const r = 0.5 + Math.random() * 1.2;
    const o = 0.3 + Math.random() * 0.5;
    stars += `<circle cx="${sx}" cy="${sy}" r="${r}" fill="white" opacity="${o}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="280" viewBox="0 0 600 280">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0f1f3a"/>
        <stop offset="100%" stop-color="#0a1628"/>
      </linearGradient>
      <linearGradient id="card" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1a2d50"/>
        <stop offset="100%" stop-color="#142240"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#60a5fa"/>
        <stop offset="100%" stop-color="#a78bfa"/>
      </linearGradient>
    </defs>
    <rect width="600" height="280" fill="url(#bg)"/>
    ${stars}
    <text x="300" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="18" font-weight="800" fill="url(#accent)">${name}</text>
    <line x1="200" y1="48" x2="400" y2="48" stroke="#60a5fa" stroke-width="1" opacity="0.3"/>
    <g transform="translate(30, 65)">
      <rect width="165" height="140" rx="10" fill="url(#card)" stroke="#3b5998" stroke-width="0.8" opacity="0.9"/>
      <text x="82" y="30" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22">&#x1F52D;</text>
      <text x="82" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#8ba4c7" font-weight="600">TELESCOPE</text>
      <text x="82" y="80" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#e0e6ed" font-weight="600">${telescope.name}</text>
      <text x="82" y="110" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#4ade80" font-weight="700">£${telescope.price.toLocaleString()}</text>
    </g>
    <g transform="translate(217, 65)">
      <rect width="165" height="140" rx="10" fill="url(#card)" stroke="#3b5998" stroke-width="0.8" opacity="0.9"/>
      <text x="82" y="30" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22">&#x1F916;</text>
      <text x="82" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#8ba4c7" font-weight="600">MOUNT</text>
      <text x="82" y="80" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#e0e6ed" font-weight="600">${mount.name}</text>
      <text x="82" y="110" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#4ade80" font-weight="700">£${mount.price.toLocaleString()}</text>
    </g>
    <g transform="translate(405, 65)">
      <rect width="165" height="140" rx="10" fill="url(#card)" stroke="#3b5998" stroke-width="0.8" opacity="0.9"/>
      <text x="82" y="30" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22">&#x1F4F7;</text>
      <text x="82" y="52" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#8ba4c7" font-weight="600">CAMERA</text>
      <text x="82" y="80" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#e0e6ed" font-weight="600">${camera.name}</text>
      <text x="82" y="110" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#4ade80" font-weight="700">£${camera.price.toLocaleString()}</text>
    </g>
    <rect x="200" y="225" width="200" height="36" rx="18" fill="url(#card)" stroke="#60a5fa" stroke-width="1" opacity="0.8"/>
    <text x="300" y="248" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" fill="#60a5fa" font-weight="700">Total: £${totalPrice.toLocaleString()}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ── Seed data ───────────────────────────────────────────────────

const SEED_SUBMISSIONS = [
  {
    id: 'seed_rig_001',
    name: 'The Nebula Hunter',
    description: 'Budget-friendly widefield setup for large nebulae. Great first rig!',
    screenshot: '',
    telescope: { id: 't5', name: 'Askar 71F', price: 539, video: 'videos/telescopes/askar-71f.mp4' },
    mount: { id: 'm9', name: 'Teseek 17', price: 499, video: 'videos/mounts/teseek-17.mp4' },
    camera: { id: 'c6', name: 'ZWO ASI 585MC', price: 382, video: 'videos/cameras/asi-585-shared.mp4' },
    totalPrice: 1420,
    createdAt: '2026-02-18T19:32:00.000Z',
    username: 'AstroNovice_92',
  },
  {
    id: 'seed_rig_002',
    name: 'Planetary Destroyer',
    description: 'Long focal length for crispy planets and lunar close-ups.',
    screenshot: '',
    telescope: { id: 't14', name: 'Skywatcher Skymax 127', price: 349, video: 'videos/telescopes/skymax-127.mp4' },
    mount: { id: 'm13', name: 'Teseek 14', price: 399, video: 'videos/mounts/teseek-14.mp4' },
    camera: { id: 'c14', name: 'SvBony SV705C - IMX585', price: 201, video: 'videos/cameras/svbony-705c.mp4' },
    totalPrice: 949,
    createdAt: '2026-02-25T14:10:00.000Z',
    username: 'LunarLens',
  },
  {
    id: 'seed_rig_003',
    name: 'Deep Sky Beast',
    description: 'Mid-range workhorse. Tackles galaxies and faint nebulae with ease.',
    screenshot: '',
    telescope: { id: 't6', name: 'Askar 103 APO', price: 999, video: 'videos/telescopes/askar-103.mp4' },
    mount: { id: 'm5', name: 'ZWO AM3', price: 1499, video: 'videos/mounts/am3.mp4' },
    camera: { id: 'c4', name: 'ZWO ASI 2600MC', price: 1599, video: 'videos/cameras/asi-2600mc.mp4' },
    totalPrice: 4097,
    createdAt: '2026-03-01T22:45:00.000Z',
    username: 'ClearSkies_UK',
  },
  {
    id: 'seed_rig_004',
    name: 'Starter Scope',
    description: 'Cheapest viable AP rig. Proving you don\'t need thousands to start!',
    screenshot: '',
    telescope: { id: 't16', name: 'SvBony MK90', price: 149, video: 'videos/telescopes/svbony-mk90.mp4' },
    mount: { id: 'm7', name: 'Teseek 11', price: 299, video: 'videos/mounts/teseek-11.mp4' },
    camera: { id: 'c14', name: 'SvBony SV705C - IMX585', price: 201, video: 'videos/cameras/svbony-705c.mp4' },
    totalPrice: 649,
    createdAt: '2026-03-04T08:20:00.000Z',
    username: 'BortleNine_Dave',
  },
  {
    id: 'seed_rig_005',
    name: 'Widefield Dream',
    description: 'Fast optics + big sensor. Entire constellations in a single frame.',
    screenshot: '',
    telescope: { id: 't4', name: 'Askar SQA55', price: 795, video: 'videos/telescopes/askar-sqa55.mp4' },
    mount: { id: 'm10', name: 'Juwei 17', price: 699, video: 'videos/mounts/juwei-17.mp4' },
    camera: { id: 'c8', name: 'ZWO ASI 533MC', price: 859, video: 'videos/cameras/asi-533.mp4' },
    totalPrice: 2353,
    createdAt: '2026-03-05T16:55:00.000Z',
    username: 'NightOwl_Astro',
  },
];

const SEED_RATINGS = {
  seed_rig_001: [
    { value: 4, createdAt: '2026-02-20T10:00:00.000Z' },
    { value: 5, createdAt: '2026-02-22T18:30:00.000Z' },
    { value: 4, createdAt: '2026-02-28T09:15:00.000Z' },
    { value: 3, createdAt: '2026-03-02T21:00:00.000Z' },
  ],
  seed_rig_002: [
    { value: 5, createdAt: '2026-02-26T11:00:00.000Z' },
    { value: 4, createdAt: '2026-02-27T14:45:00.000Z' },
    { value: 5, createdAt: '2026-03-01T08:20:00.000Z' },
  ],
  seed_rig_003: [
    { value: 5, createdAt: '2026-03-02T10:30:00.000Z' },
    { value: 5, createdAt: '2026-03-03T19:00:00.000Z' },
    { value: 4, createdAt: '2026-03-04T12:00:00.000Z' },
    { value: 5, createdAt: '2026-03-05T07:30:00.000Z' },
    { value: 4, createdAt: '2026-03-05T20:15:00.000Z' },
  ],
  seed_rig_004: [
    { value: 4, createdAt: '2026-03-04T15:00:00.000Z' },
    { value: 3, createdAt: '2026-03-05T10:30:00.000Z' },
  ],
  seed_rig_005: [
    { value: 5, createdAt: '2026-03-05T20:00:00.000Z' },
    { value: 4, createdAt: '2026-03-06T01:30:00.000Z' },
    { value: 5, createdAt: '2026-03-06T06:10:00.000Z' },
  ],
};

// ── Capture a single video frame ────────────────────────────────

function captureVideoFrame(videoUrl) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    const cleanup = () => { video.src = ''; video.load(); };
    const timeout = setTimeout(() => { cleanup(); resolve(null); }, 5000);

    video.addEventListener('loadeddata', () => {
      // Seek to 1s for a representative frame
      video.currentTime = 1;
    }, { once: true });

    video.addEventListener('seeked', () => {
      clearTimeout(timeout);
      try {
        const c = document.createElement('canvas');
        c.width = video.videoWidth;
        c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0);
        resolve(c.toDataURL('image/jpeg', 0.7));
      } catch {
        resolve(null);
      }
      cleanup();
    }, { once: true });

    video.addEventListener('error', () => { clearTimeout(timeout); cleanup(); resolve(null); }, { once: true });
    video.src = videoUrl;
  });
}

// ── Compose a rig preview from video frames ─────────────────────

async function composeSeedPreview(submission) {
  const parts = [
    { label: 'Telescope', emoji: '\u{1F52D}', data: submission.telescope },
    { label: 'Mount', emoji: '\u{1F916}', data: submission.mount },
    { label: 'Camera', emoji: '\u{1F4F7}', data: submission.camera },
  ];

  // Load all 3 video frames in parallel
  const frameDataUrls = await Promise.all(
    parts.map(p => p.data.video ? captureVideoFrame(`/${p.data.video}`) : Promise.resolve(null))
  );

  // Pre-decode frame images so they're ready for canvas drawImage
  const frameImages = await Promise.all(
    frameDataUrls.map(url => {
      if (!url) return Promise.resolve(null);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    })
  );

  // Build an off-screen composite
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 720, 320);
  bg.addColorStop(0, '#0a1628');
  bg.addColorStop(1, '#142240');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 720, 320);

  // Title
  ctx.fillStyle = '#60a5fa';
  ctx.font = '700 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(submission.name, 360, 30);

  // Three product cards
  const cardW = 210, cardH = 240, gap = 16;
  const startX = (720 - (cardW * 3 + gap * 2)) / 2;

  for (let i = 0; i < 3; i++) {
    const x = startX + i * (cardW + gap);
    const y = 48;

    // Card background
    ctx.fillStyle = 'rgba(25, 42, 70, 0.9)';
    ctx.beginPath();
    ctx.roundRect(x, y, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 100, 160, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#8ba4c7';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(parts[i].label.toUpperCase(), x + cardW / 2, y + 18);

    // Video frame or emoji placeholder
    const imgX = x + 15, imgY = y + 28, imgW = cardW - 30, imgH = 120;
    const img = frameImages[i];
    if (img && img.naturalWidth > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 6);
      ctx.clip();
      // Cover-fit
      const srcAspect = img.naturalWidth / img.naturalHeight;
      const dstAspect = imgW / imgH;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (srcAspect > dstAspect) {
        sw = img.naturalHeight * dstAspect;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        sh = img.naturalWidth / dstAspect;
        sy = (img.naturalHeight - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, imgX, imgY, imgW, imgH);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(15, 25, 40, 0.8)';
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 6);
      ctx.fill();
      ctx.font = '36px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(parts[i].emoji, x + cardW / 2, imgY + imgH / 2 + 12);
    }

    // Product name
    ctx.fillStyle = '#e0e6ed';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(parts[i].data.name, x + cardW / 2, y + 170);

    // Price
    ctx.fillStyle = '#4ade80';
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.fillText(`\u00A3${parts[i].data.price.toLocaleString()}`, x + cardW / 2, y + 192);
  }

  // Total pill
  ctx.fillStyle = 'rgba(25, 42, 70, 0.9)';
  ctx.beginPath();
  ctx.roundRect(260, 296, 200, 20, 10);
  ctx.fill();
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#60a5fa';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Total: \u00A3${submission.totalPrice.toLocaleString()}`, 360, 310);

  return canvas.toDataURL('image/jpeg', 0.75);
}

// ── Seeding logic ───────────────────────────────────────────────

function ensureSeeded() {
  if (localStorage.getItem(SEEDED_KEY)) return;
  const existing = loadJSON(SUBMISSIONS_KEY, []);
  if (existing.length === 0) {
    // Seed immediately with SVG placeholders
    const seeded = SEED_SUBMISSIONS.map(s => ({
      ...s,
      screenshot: generateRigPreviewSVG(s.name, s.telescope, s.mount, s.camera, s.totalPrice),
    }));
    saveJSON(SUBMISSIONS_KEY, seeded);
    const ratings = loadJSON(RATINGS_KEY, {});
    Object.assign(ratings, SEED_RATINGS);
    saveJSON(RATINGS_KEY, ratings);
  }
  localStorage.setItem(SEEDED_KEY, 'true');
}

/**
 * Upgrade seed screenshots with real video-frame composites.
 * Call after DOM is ready. Runs in background, no UI blocking.
 */
export async function upgradeSeedPreviews(onDone) {
  const submissions = loadJSON(SUBMISSIONS_KEY, []);
  const seeds = submissions.filter(s => s.id.startsWith('seed_rig_'));
  if (seeds.length === 0) return;

  // Check if already upgraded (seeds have JPEG screenshots, not SVG)
  if (seeds[0].screenshot && seeds[0].screenshot.startsWith('data:image/jpeg')) return;

  let changed = false;
  for (const seed of seeds) {
    const template = SEED_SUBMISSIONS.find(t => t.id === seed.id);
    if (!template) continue;
    try {
      const preview = await composeSeedPreview(template);
      if (preview) {
        seed.screenshot = preview;
        changed = true;
      }
    } catch { /* keep SVG fallback */ }
  }

  if (changed) {
    saveJSON(SUBMISSIONS_KEY, submissions);
    if (onDone) onDone();
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

// ── Run seed on first load ───────────────────────────────────────
ensureSeeded();

// ── Submissions ──────────────────────────────────────────────────

export function getSubmissions() {
  return loadJSON(SUBMISSIONS_KEY, []);
}

export function getSubmission(id) {
  return getSubmissions().find((s) => s.id === id) || null;
}

/**
 * Persist a new rig submission.
 * @param {Object} data - { name, description, screenshot, telescope, mount, camera, totalPrice }
 * @returns {Object} The saved submission (with generated id + createdAt).
 */
export function addSubmission(data) {
  const submissions = getSubmissions();
  const submission = {
    id: `rig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: data.name || `Rig #${submissions.length + 1}`,
    username: data.username || '',
    description: data.description || '',
    screenshot: data.screenshot || '',
    telescope: data.telescope,
    mount: data.mount,
    camera: data.camera,
    totalPrice: data.totalPrice,
    createdAt: new Date().toISOString(),
  };
  submissions.push(submission);
  saveJSON(SUBMISSIONS_KEY, submissions);
  return submission;
}

export function getNextRigNumber() {
  return getSubmissions().length + 1;
}

// ── Ratings ──────────────────────────────────────────────────────

export function getAverageRating(rigId) {
  const all = loadJSON(RATINGS_KEY, {});
  const rigRatings = all[rigId] || [];
  if (rigRatings.length === 0) return { average: 3.0, count: 0 };
  const sum = rigRatings.reduce((acc, r) => acc + r.value, 0);
  return {
    average: Math.round((sum / rigRatings.length) * 10) / 10,
    count: rigRatings.length,
  };
}

/**
 * Record a rating (1–5) for a rig. One per browser (localStorage guard).
 * @returns {{ average: number, count: number }} updated stats.
 */
export function addRating(rigId, value) {
  const all = loadJSON(RATINGS_KEY, {});
  if (!all[rigId]) all[rigId] = [];
  all[rigId].push({ value, createdAt: new Date().toISOString() });
  saveJSON(RATINGS_KEY, all);
  // Mark this browser as having rated this rig
  localStorage.setItem(`${RATED_PREFIX}${rigId}`, 'true');
  return getAverageRating(rigId);
}

export function hasUserRated(rigId) {
  return localStorage.getItem(`${RATED_PREFIX}${rigId}`) === 'true';
}
