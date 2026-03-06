// ── Card reveal sequence ────────────────────────────────────────

export function animateRevealSequence(cards, onComplete) {
  const DELAY_BETWEEN = 400;
  const items = Array.from(cards);

  items.forEach((card, i) => {
    setTimeout(() => {
      card.classList.remove('pir-card--hidden');
      card.classList.add('pir-card--revealing');

      // Play video once card is revealed
      const video = card.querySelector('video');
      if (video) video.play().catch(() => {});

      setTimeout(() => {
        card.classList.remove('pir-card--revealing');
        card.classList.add('pir-card--revealed');
      }, 350);
    }, i * DELAY_BETWEEN);
  });

  // All revealed, proceed
  setTimeout(onComplete, items.length * DELAY_BETWEEN + 400);
}

// ── Score reveal (count-up with suspense) ───────────────────────

export function animateScoreReveal(guessEl, actualEl, guess, actual, onComplete) {
  // Count up guess first
  animateCountUp(guessEl, 0, guess, 350, () => {
    // Brief pause, then count up actual
    setTimeout(() => {
      actualEl.classList.add('pir-dramatic');
      animateCountUp(actualEl, 0, actual, 450, () => {
        actualEl.classList.remove('pir-dramatic');
        if (onComplete) onComplete();
      });
    }, 150);
  });
}

// ── Count-up number animation ───────────────────────────────────

export function animateCountUp(el, from, to, duration, onDone) {
  const start = performance.now();
  const range = to - from;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + range * eased);

    if (el.dataset.prefix === 'none') {
      el.textContent = current.toLocaleString('en-GB');
    } else {
      el.textContent = `\u00a3${current.toLocaleString('en-GB')}`;
    }

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (onDone) {
      onDone();
    }
  }
  requestAnimationFrame(tick);
}

// ── Confetti burst ──────────────────────────────────────────────

export function animateConfetti(container) {
  if (!container) return;
  container.innerHTML = '';

  const COLORS = ['#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];
  const COUNT = 60;

  for (let i = 0; i < COUNT; i++) {
    const piece = document.createElement('div');
    piece.className = 'pir-confetti-piece';
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.5;
    const size = 4 + Math.random() * 6;
    const drift = -50 + Math.random() * 100;
    const spin = Math.random() * 720;

    piece.style.cssText = `
      left: ${left}%;
      width: ${size}px;
      height: ${size * (0.4 + Math.random() * 0.6)}px;
      background: ${color};
      animation-delay: ${delay}s;
      --drift: ${drift}px;
      --spin: ${spin}deg;
    `;
    container.appendChild(piece);
  }

  // Clean up after animation
  setTimeout(() => { container.innerHTML = ''; }, 2000);
}

// ── Pulse micro-animation ───────────────────────────────────────

export function animatePulse(el) {
  el.classList.remove('pir-pulse');
  void el.offsetWidth; // force reflow
  el.classList.add('pir-pulse');
}

// ── Parallax depth on cursor ────────────────────────────────────

let parallaxHandler = null;

export function setupParallax(overlay) {
  if (!overlay) return;
  parallaxHandler = (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    const spotL = overlay.querySelector('.pir-spotlight--left');
    const spotR = overlay.querySelector('.pir-spotlight--right');
    if (spotL) spotL.style.transform = `translate(${x * 15}px, ${y * 10}px)`;
    if (spotR) spotR.style.transform = `translate(${x * -15}px, ${y * -10}px)`;

    // Subtle card tilt on hover (compose with base 180deg flip)
    const cards = overlay.querySelectorAll('.pir-card--revealed .pir-card-inner');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / rect.width;
      const dy = (e.clientY - cy) / rect.height;
      card.style.transform = `rotateY(${180 + dx * 6}deg) rotateX(${-dy * 6}deg)`;
    });
  };
  window.addEventListener('mousemove', parallaxHandler);
}

export function teardownParallax() {
  if (parallaxHandler) {
    window.removeEventListener('mousemove', parallaxHandler);
    parallaxHandler = null;
  }
}
