// ── Atmosphere: starfield, cursor trail, twinkling ──────────────
// Single canvas rendered behind the PIR overlay content.
// All effects are performance-conscious — reduced on mobile.

const CONFIG = {
  // Starfield
  starLayers: [
    { count: 80, sizeMin: 0.4, sizeMax: 1.2, speed: 0.08, opacity: 0.5 },
    { count: 50, sizeMin: 1.0, sizeMax: 2.0, speed: 0.15, opacity: 0.7 },
    { count: 20, sizeMin: 1.8, sizeMax: 3.0, speed: 0.25, opacity: 0.9 },
  ],
  // Twinkling
  twinkleCount: 12,
  twinkleSpeed: 0.02,
  // Cursor trail
  trailMaxParticles: 35,
  trailLifespan: 40,
  trailSizeMin: 1,
  trailSizeMax: 3.5,
  // Shooting stars
  shootingStarChance: 0.002,
};

// Mobile detection
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;
if (isMobile) {
  CONFIG.starLayers[0].count = 40;
  CONFIG.starLayers[1].count = 25;
  CONFIG.starLayers[2].count = 10;
  CONFIG.twinkleCount = 6;
  CONFIG.trailMaxParticles = 0; // disable cursor trail on mobile
  CONFIG.shootingStarChance = 0.001;
}

let canvas = null;
let ctx = null;
let animId = null;
let stars = [];
let twinklers = [];
let trail = [];
let shootingStars = [];
let mouse = { x: -1, y: -1 };
let mouseHandler = null;

// ── Init ────────────────────────────────────────────────────────

export function initAtmosphere(container) {
  if (canvas) destroyAtmosphere();

  canvas = document.createElement('canvas');
  canvas.className = 'pir-atmosphere-canvas';
  container.prepend(canvas);

  ctx = canvas.getContext('2d');
  resize();

  window.addEventListener('resize', resize);
  mouseHandler = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
  window.addEventListener('mousemove', mouseHandler);

  generateStars();
  generateTwinklers();
  tick();
}

export function destroyAtmosphere() {
  if (animId) cancelAnimationFrame(animId);
  animId = null;
  if (canvas) canvas.remove();
  canvas = null;
  ctx = null;
  stars = [];
  twinklers = [];
  trail = [];
  shootingStars = [];
  window.removeEventListener('resize', resize);
  if (mouseHandler) {
    window.removeEventListener('mousemove', mouseHandler);
    mouseHandler = null;
  }
}

// ── Resize ──────────────────────────────────────────────────────

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// ── Star generation ─────────────────────────────────────────────

function generateStars() {
  stars = [];
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (const layer of CONFIG.starLayers) {
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: layer.sizeMin + Math.random() * (layer.sizeMax - layer.sizeMin),
        speed: layer.speed,
        opacity: layer.opacity * (0.5 + Math.random() * 0.5),
        baseOpacity: layer.opacity * (0.5 + Math.random() * 0.5),
      });
    }
  }
}

function generateTwinklers() {
  twinklers = [];
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (let i = 0; i < CONFIG.twinkleCount; i++) {
    twinklers.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1.5 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      speed: CONFIG.twinkleSpeed * (0.5 + Math.random()),
    });
  }
}

// ── Render loop ─────────────────────────────────────────────────

function tick() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStars();
  drawTwinklers();
  drawShootingStars();
  drawCursorTrail();

  // Random shooting star
  if (Math.random() < CONFIG.shootingStarChance) {
    spawnShootingStar();
  }

  animId = requestAnimationFrame(tick);
}

// ── Stars with parallax ────────────────────────────────────────

function drawStars() {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const mx = mouse.x >= 0 ? (mouse.x - cx) / cx : 0;
  const my = mouse.y >= 0 ? (mouse.y - cy) / cy : 0;

  for (const s of stars) {
    const px = s.x + mx * s.speed * 30;
    const py = s.y + my * s.speed * 30;

    ctx.beginPath();
    ctx.arc(px, py, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220, 235, 255, ${s.opacity * 1.2})`;
    ctx.fill();
  }
}

// ── Twinkling stars ─────────────────────────────────────────────

function drawTwinklers() {
  for (const t of twinklers) {
    t.phase += t.speed;
    const brightness = 0.3 + Math.abs(Math.sin(t.phase)) * 0.7;
    const glow = t.size * (1 + brightness * 0.8);

    // Soft outer glow
    const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, glow * 3);
    grad.addColorStop(0, `rgba(180, 210, 255, ${brightness * 0.6})`);
    grad.addColorStop(0.4, `rgba(180, 210, 255, ${brightness * 0.15})`);
    grad.addColorStop(1, 'rgba(180, 210, 255, 0)');
    ctx.beginPath();
    ctx.arc(t.x, t.y, glow * 3, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Bright core
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.size * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(230, 240, 255, ${brightness})`;
    ctx.fill();
  }
}

// ── Shooting stars ──────────────────────────────────────────────

function spawnShootingStar() {
  const w = canvas.width;
  const h = canvas.height;
  shootingStars.push({
    x: Math.random() * w * 0.8,
    y: Math.random() * h * 0.3,
    vx: 4 + Math.random() * 4,
    vy: 2 + Math.random() * 2,
    life: 1,
    decay: 0.015 + Math.random() * 0.01,
    length: 40 + Math.random() * 60,
  });
}

function drawShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life -= s.decay;

    if (s.life <= 0) {
      shootingStars.splice(i, 1);
      continue;
    }

    const tailX = s.x - s.vx * s.length * 0.15;
    const tailY = s.y - s.vy * s.length * 0.15;

    const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
    grad.addColorStop(0, `rgba(180, 210, 255, 0)`);
    grad.addColorStop(1, `rgba(220, 235, 255, ${s.life * 0.8})`);

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(s.x, s.y);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Bright head
    ctx.beginPath();
    ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${s.life})`;
    ctx.fill();
  }
}

// ── Cursor stardust trail ──────────────────────────────────────

function drawCursorTrail() {
  if (CONFIG.trailMaxParticles === 0) return;
  if (mouse.x < 0 || mouse.y < 0) return;

  // Spawn new particles
  if (trail.length < CONFIG.trailMaxParticles) {
    const angle = Math.random() * Math.PI * 2;
    const spread = Math.random() * 8;
    trail.push({
      x: mouse.x + Math.cos(angle) * spread,
      y: mouse.y + Math.sin(angle) * spread,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5 - 0.3,
      life: CONFIG.trailLifespan,
      maxLife: CONFIG.trailLifespan,
      size: CONFIG.trailSizeMin + Math.random() * (CONFIG.trailSizeMax - CONFIG.trailSizeMin),
      hue: 200 + Math.random() * 40,
    });
  }

  for (let i = trail.length - 1; i >= 0; i--) {
    const p = trail[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    if (p.life <= 0) {
      trail.splice(i, 1);
      continue;
    }

    const progress = p.life / p.maxLife;
    const alpha = progress * 0.6;
    const size = p.size * progress;

    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.5);
    grad.addColorStop(0, `hsla(${p.hue}, 70%, 80%, ${alpha})`);
    grad.addColorStop(0.5, `hsla(${p.hue}, 60%, 60%, ${alpha * 0.3})`);
    grad.addColorStop(1, `hsla(${p.hue}, 50%, 50%, 0)`);

    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }
}
