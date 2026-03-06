import {
  gameState, resetGame, generateGameRig, scoreGuess,
  TOTAL_ROUNDS, GUESS_MIN, GUESS_MAX, SCORING_TIERS,
} from './gameState.js';
import {
  animateRevealSequence, animateScoreReveal, animateConfetti,
  animatePulse, animateCountUp, setupParallax, teardownParallax,
} from './animations.js';
import { initAtmosphere, destroyAtmosphere } from './atmosphere.js';

let overlay = null;

// ── Public API ──────────────────────────────────────────────────

export function launchGame() {
  resetGame();
  gameState.active = true;
  gameState.phase = 'reveal';
  buildOverlay();
  document.body.style.overflow = 'hidden';
  setupParallax(overlay);
  initAtmosphere(overlay);
  startRound();
}

export function exitGame() {
  gameState.active = false;
  gameState.phase = 'idle';
  teardownParallax();
  destroyAtmosphere();
  if (overlay) {
    overlay.classList.add('pir-exit');
    setTimeout(() => {
      overlay.remove();
      overlay = null;
    }, 250);
  }
  document.body.style.overflow = '';
}

// ── Overlay shell ───────────────────────────────────────────────

function buildOverlay() {
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.className = 'pir-overlay';
  overlay.innerHTML = `
    <div class="pir-stage">
      <div class="pir-spotlight pir-spotlight--left"></div>
      <div class="pir-spotlight pir-spotlight--right"></div>
      <div class="pir-spotlight pir-spotlight--center"></div>
      <div class="pir-scanlines"></div>
      <div class="pir-header">
        <button class="pir-close" aria-label="Exit game">&times;</button>
        <div class="pir-title-group">
          <h1 class="pir-title">THE PRICE IS RIGHT</h1>
          <div class="pir-subtitle">Astronomy Edition</div>
        </div>
        <div class="pir-round-indicator"></div>
      </div>
      <div class="pir-content"></div>
      <div class="pir-confetti-container"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.pir-close').addEventListener('click', exitGame);
  requestAnimationFrame(() => overlay.classList.add('pir-enter'));
}

// ── Round flow ──────────────────────────────────────────────────

function startRound() {
  gameState.currentRound++;
  gameState.phase = 'reveal';

  const rig = generateGameRig();
  if (!rig) {
    showError('Not enough product combinations available!');
    return;
  }
  gameState.currentRig = rig;

  updateRoundIndicator();
  showRevealPhase(rig);
}

function updateRoundIndicator() {
  const ind = overlay.querySelector('.pir-round-indicator');
  let dots = '';
  for (let i = 1; i <= TOTAL_ROUNDS; i++) {
    const cls = i < gameState.currentRound ? 'done' :
                i === gameState.currentRound ? 'active' : '';
    dots += `<span class="pir-dot ${cls}"><span class="pir-dot-num">${i}</span></span>`;
    if (i < TOTAL_ROUNDS) dots += '<span class="pir-dot-line"></span>';
  }
  ind.innerHTML = dots;
}

// ── Reveal phase ────────────────────────────────────────────────

function showRevealPhase(rig) {
  const content = overlay.querySelector('.pir-content');
  content.innerHTML = `
    <div class="pir-round-announce pir-fade-in">Round ${gameState.currentRound}</div>
    <div class="pir-reveal-stage">
      <div class="pir-cards">
        <div class="pir-card pir-card--hidden" data-idx="0">
          <div class="pir-card-inner">
            <div class="pir-card-front">
              <div class="pir-card-icon">&#x1f52d;</div>
              <div class="pir-card-label">Telescope</div>
              <div class="pir-card-question">?</div>
            </div>
            <div class="pir-card-back">
              <div class="pir-card-media" id="pir-media-telescope"></div>
              <div class="pir-card-info">
                <div class="pir-card-name">${escapeHtml(rig.telescope.name)}</div>
                <div class="pir-card-type">Telescope</div>
              </div>
            </div>
          </div>
        </div>
        <div class="pir-card pir-card--hidden" data-idx="1">
          <div class="pir-card-inner">
            <div class="pir-card-front">
              <div class="pir-card-icon">&#x1f916;</div>
              <div class="pir-card-label">Mount</div>
              <div class="pir-card-question">?</div>
            </div>
            <div class="pir-card-back">
              <div class="pir-card-media" id="pir-media-mount"></div>
              <div class="pir-card-info">
                <div class="pir-card-name">${escapeHtml(rig.mount.name)}</div>
                <div class="pir-card-type">Mount</div>
              </div>
            </div>
          </div>
        </div>
        <div class="pir-card pir-card--hidden" data-idx="2">
          <div class="pir-card-inner">
            <div class="pir-card-front">
              <div class="pir-card-icon">&#x1f4f7;</div>
              <div class="pir-card-label">Camera</div>
              <div class="pir-card-question">?</div>
            </div>
            <div class="pir-card-back">
              <div class="pir-card-media" id="pir-media-camera"></div>
              <div class="pir-card-info">
                <div class="pir-card-name">${escapeHtml(rig.camera.name)}</div>
                <div class="pir-card-type">Camera</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  loadCardMedia('telescope', rig.telescope);
  loadCardMedia('mount', rig.mount);
  loadCardMedia('camera', rig.camera);

  const cards = content.querySelectorAll('.pir-card');
  animateRevealSequence(cards, () => {
    gameState.phase = 'guessing';
    showGuessUI();
  });
}

function loadCardMedia(category, product) {
  const container = overlay.querySelector(`#pir-media-${category}`);
  if (!container) return;

  if (product.video) {
    const video = document.createElement('video');
    video.src = product.video;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.className = 'pir-card-video';
    video.play().catch(() => {});
    container.appendChild(video);
  } else {
    container.innerHTML = `<div class="pir-card-placeholder">${escapeHtml(product.name)}</div>`;
  }
}

// ── Guess phase ─────────────────────────────────────────────────

function showGuessUI() {
  const content = overlay.querySelector('.pir-content');
  // Remove the round announce
  const announce = content.querySelector('.pir-round-announce');
  if (announce) announce.remove();

  const guessSection = document.createElement('div');
  guessSection.className = 'pir-guess-section pir-fade-in';
  guessSection.innerHTML = `
    <div class="pir-guess-prompt">Set your total for this rig</div>
    <div class="pir-guess-display">
      <span class="pir-guess-currency">&pound;</span>
      <span class="pir-guess-value">${formatNum(5000)}</span>
    </div>
    <div class="pir-slider-wrap">
      <span class="pir-slider-min">&pound;${formatNum(GUESS_MIN)}</span>
      <input type="range" class="pir-slider" min="${GUESS_MIN}" max="${GUESS_MAX}" value="5000" step="50" />
      <span class="pir-slider-max">&pound;${formatNum(GUESS_MAX)}</span>
    </div>
    <button class="pir-submit-btn">Lock In Guess</button>
    <div class="pir-scoring-hint">
      ${SCORING_TIERS.map(t =>
        `<span>Within ${Math.round(t.within * 100)}% &rarr; ${t.points}pts</span>`
      ).join('')}
    </div>
  `;
  content.appendChild(guessSection);

  const slider = guessSection.querySelector('.pir-slider');
  const display = guessSection.querySelector('.pir-guess-value');
  slider.addEventListener('input', () => {
    display.textContent = formatNum(parseInt(slider.value));
    animatePulse(display);
  });

  guessSection.querySelector('.pir-submit-btn').addEventListener('click', () => {
    submitGuess(parseInt(slider.value));
  });
}

// ── Result phase ────────────────────────────────────────────────

function submitGuess(guess) {
  const rig = gameState.currentRig;
  const actual = rig.total;
  const result = scoreGuess(guess, actual);

  gameState.rounds.push({
    telescope: rig.telescope,
    mount: rig.mount,
    camera: rig.camera,
    actualTotal: actual,
    guess,
    score: result.points,
    tier: result,
  });
  gameState.totalScore += result.points;
  gameState.phase = 'result';

  showResultPhase(guess, actual, result);
}

function showResultPhase(guess, actual, result) {
  const content = overlay.querySelector('.pir-content');
  const rig = gameState.currentRig;

  const guessSection = content.querySelector('.pir-guess-section');
  if (guessSection) guessSection.remove();

  const commentary = getResultCommentary(result);
  const hasBuyLinks = rig.telescope.affiliateUrl || rig.mount.affiliateUrl || rig.camera.affiliateUrl;

  const resultDiv = document.createElement('div');
  resultDiv.className = 'pir-result-section pir-fade-in';
  resultDiv.innerHTML = `
    <div class="pir-result-header">Let's see how close you were...</div>
    <div class="pir-result-comparison">
      <div class="pir-result-col">
        <div class="pir-result-label">Your Guess</div>
        <div class="pir-result-amount pir-result-guess" id="pir-guess-countup">&pound;0</div>
      </div>
      <div class="pir-result-vs">VS</div>
      <div class="pir-result-col">
        <div class="pir-result-label">Actual Price</div>
        <div class="pir-result-amount pir-result-actual" id="pir-actual-countup">&pound;0</div>
      </div>
    </div>
    <div class="pir-result-verdict">
      <div class="pir-result-tier">${escapeHtml(result.label)}</div>
      <div class="pir-result-detail">${result.pct}% off &mdash; ${escapeHtml(commentary)} &mdash; <strong>+${result.points}pts</strong></div>
    </div>
    <div class="pir-result-actions">
      ${hasBuyLinks ? '<button class="pir-buy-rig-btn">Buy this Rig</button>' : ''}
      <button class="pir-next-btn">${gameState.currentRound < TOTAL_ROUNDS ? 'Next Round' : 'See Final Score'}</button>
    </div>
    <div class="pir-result-score-bar">
      <span class="pir-running-total">${gameState.totalScore}</span>
      <span class="pir-score-divider">/</span>
      <span class="pir-score-max">${TOTAL_ROUNDS * 10}</span>
    </div>
  `;
  content.appendChild(resultDiv);

  animateScoreReveal(
    resultDiv.querySelector('#pir-guess-countup'),
    resultDiv.querySelector('#pir-actual-countup'),
    guess, actual,
    () => {
      if (result.points >= 5) {
        animateConfetti(overlay.querySelector('.pir-confetti-container'));
      }
    }
  );

  const buyBtn = resultDiv.querySelector('.pir-buy-rig-btn');
  if (buyBtn) {
    buyBtn.addEventListener('click', () => openRigLinks(rig));
  }

  resultDiv.querySelector('.pir-next-btn').addEventListener('click', () => {
    if (gameState.currentRound < TOTAL_ROUNDS) {
      startRound();
    } else {
      showSummary();
    }
  });
}

function getResultCommentary(result) {
  if (result.points >= 10) return "Phenomenal!";
  if (result.points >= 5) return "Strong round.";
  if (result.points >= 3) return "Decent read.";
  if (result.points >= 1) return "In the ballpark.";
  return "Tough one.";
}

// ── Summary phase ───────────────────────────────────────────────

function showSummary() {
  gameState.phase = 'summary';
  const content = overlay.querySelector('.pir-content');

  const maxScore = TOTAL_ROUNDS * 10;
  const pct = Math.round((gameState.totalScore / maxScore) * 100);
  let verdict, verdictClass, verdictSub;
  if (pct >= 80) {
    verdict = 'Price Master';
    verdictClass = 'gold';
    verdictSub = 'You really know your gear.';
  } else if (pct >= 50) {
    verdict = 'Sharp Eye';
    verdictClass = 'silver';
    verdictSub = 'Solid instincts across the board.';
  } else if (pct >= 20) {
    verdict = 'Getting There';
    verdictClass = 'bronze';
    verdictSub = "You've got potential. Try again?";
  } else {
    verdict = 'Keep Practising';
    verdictClass = '';
    verdictSub = "The stars will align next time.";
  }

  content.innerHTML = `
    <div class="pir-summary pir-fade-in">
      <div class="pir-summary-trophy ${verdictClass}">
        <div class="pir-trophy-icon">${pct >= 80 ? '&#x1f3c6;' : pct >= 50 ? '&#x2b50;' : pct >= 20 ? '&#x1f44d;' : '&#x1f680;'}</div>
        <div class="pir-summary-verdict">${verdict}</div>
        <div class="pir-summary-verdict-sub">${verdictSub}</div>
        <div class="pir-summary-score">
          <span class="pir-big-score" id="pir-final-score" data-prefix="none">0</span>
          <span class="pir-max-score"> / ${maxScore}</span>
        </div>
      </div>
      <div class="pir-summary-rounds">
        ${gameState.rounds.map((r, i) => {
          const hasLinks = r.telescope.affiliateUrl || r.mount.affiliateUrl || r.camera.affiliateUrl;
          return `
          <div class="pir-summary-round" data-round="${i}">
            <div class="pir-summary-round-header">
              <span class="pir-summary-round-num">Round ${i + 1}</span>
              <span class="pir-summary-round-pts ${r.score >= 5 ? 'high' : r.score >= 1 ? 'mid' : ''}">+${r.score}</span>
            </div>
            <div class="pir-summary-round-rig">
              ${escapeHtml(r.telescope.name)} + ${escapeHtml(r.mount.name)} + ${escapeHtml(r.camera.name)}
            </div>
            <div class="pir-summary-round-detail">
              Guessed &pound;${formatNum(r.guess)} &mdash; Actual &pound;${formatNum(r.actualTotal)}
              ${hasLinks ? `<button class="pir-summary-buy-btn" data-round="${i}">Buy this Rig</button>` : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="pir-summary-actions">
        <button class="pir-play-again-btn">Play Again</button>
        <button class="pir-exit-btn">Back to Rig Builder</button>
      </div>
    </div>
  `;

  animateCountUp(content.querySelector('#pir-final-score'), 0, gameState.totalScore, 800);

  if (pct >= 50) {
    animateConfetti(overlay.querySelector('.pir-confetti-container'));
  }

  // Buy buttons for each round
  content.querySelectorAll('.pir-summary-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = gameState.rounds[parseInt(btn.dataset.round)];
      openRigLinks({ telescope: r.telescope, mount: r.mount, camera: r.camera });
    });
  });

  content.querySelector('.pir-play-again-btn').addEventListener('click', () => {
    resetGame();
    gameState.active = true;
    gameState.phase = 'reveal';
    updateRoundIndicator();
    startRound();
  });
  content.querySelector('.pir-exit-btn').addEventListener('click', exitGame);
}

// ── Helpers ─────────────────────────────────────────────────────

function openRigLinks(rig) {
  const urls = [rig.telescope.affiliateUrl, rig.mount.affiliateUrl, rig.camera.affiliateUrl]
    .filter(Boolean);
  for (const url of urls) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

function showError(msg) {
  const content = overlay.querySelector('.pir-content');
  content.innerHTML = `<div class="pir-error">${escapeHtml(msg)}<br><button class="pir-exit-btn" style="margin-top:20px">Back</button></div>`;
  content.querySelector('.pir-exit-btn').addEventListener('click', exitGame);
}

function formatNum(n) {
  return n.toLocaleString('en-GB');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
