// ── Cursor stardust trail ─────────────────────────────────────────────
// Canvas overlay that spawns vibrant star particles at the cursor.
// Interpolates between mouse positions for a fluid, gap-free trail.
// Fades out within ~1s when the cursor is stationary.

const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 768;

let canvas, ctx, animId;
let particles = [];
let mouse = { x: -100, y: -100 };
let prevMouse = { x: -100, y: -100 };
let hasMovedOnce = false;
let lastMoveTime = 0;

const CONFIG = {
  maxParticles: isMobile ? 0 : 85,
  spawnPerPoint: 2,
  interpSpacing: 5,
  lifespan: 35,
  sizeMin: 0.6,
  sizeMax: 1.9,
  spread: 6,
  colors: [
    [100, 170, 255],     // vivid blue
    [180, 120, 255],     // vivid purple
    [255, 140, 200],     // hot pink
    [255, 200, 80],      // bright gold
    [80, 230, 190],      // vivid teal
    [200, 220, 255],     // white-blue
    [150, 90, 255],      // deep violet
    [255, 120, 160],     // vivid rose
    [120, 255, 200],     // mint
    [255, 160, 60],      // amber
  ],
};

export function initCursorTrail() {
  if (isMobile || CONFIG.maxParticles === 0) return;

  canvas = document.createElement('canvas');
  canvas.className = 'cursor-trail-canvas';
  document.body.appendChild(canvas);

  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    lastMoveTime = performance.now();
    if (!hasMovedOnce) {
      prevMouse.x = mouse.x;
      prevMouse.y = mouse.y;
      hasMovedOnce = true;
    }
  });

  tick();
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function spawnAt(x, y, count) {
  for (let i = 0; i < count; i++) {
    if (particles.length >= CONFIG.maxParticles) return;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * CONFIG.spread;
    const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
    particles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * 0.7,
      vy: (Math.random() - 0.5) * 0.7 - 0.3,
      life: CONFIG.lifespan,
      maxLife: CONFIG.lifespan,
      size: CONFIG.sizeMin + Math.random() * (CONFIG.sizeMax - CONFIG.sizeMin),
      color,
    });
  }
}

function tick() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Only spawn when mouse is actively moving (idle = fade out naturally)
  const idle = performance.now() - lastMoveTime > 100; // 100ms threshold

  if (!idle && hasMovedOnce && mouse.x > 0 && mouse.y > 0) {
    const dx = mouse.x - prevMouse.x;
    const dy = mouse.y - prevMouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < CONFIG.interpSpacing) {
      spawnAt(mouse.x, mouse.y, CONFIG.spawnPerPoint);
    } else {
      const steps = Math.ceil(dist / CONFIG.interpSpacing);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        spawnAt(
          prevMouse.x + dx * t,
          prevMouse.y + dy * t,
          CONFIG.spawnPerPoint
        );
      }
    }

    prevMouse.x = mouse.x;
    prevMouse.y = mouse.y;
  }

  // Update and draw
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const progress = p.life / p.maxLife;
    const alpha = progress * 0.75;
    const size = p.size * (0.3 + progress * 0.7);
    const [r, g, b] = p.color;

    // Bright core + soft glow
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.5);
    grad.addColorStop(0, `rgba(${Math.min(r + 60, 255)}, ${Math.min(g + 60, 255)}, ${Math.min(b + 60, 255)}, ${alpha})`);
    grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${alpha * 0.7})`);
    grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${alpha * 0.2})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  animId = requestAnimationFrame(tick);
}
