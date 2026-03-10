/**
 * Modal for submitting the current rig to the community gallery.
 *
 * Flow:
 *  1. Show rig summary + optional name/description fields.
 *  2. On confirm → capture screenshot → save to store → refresh carousel.
 */

import { el } from '../dom.js';
import { state, formatPrice } from '../state.js';
import { addSubmission, getNextRigNumber } from './communityStore.js';
import { captureRigPreview } from './captureRigPreview.js';
import { refreshCarousel } from './rigCarousel.js';

let modalOverlay = null;

// ── Profanity filter ─────────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /f+[u\*@]+[c\*@]+[k\*@]+/i, /s+h+[i\*@1]+[t\*@]+/i, /b+[i\*@1]+[t\*@]+[c\*@]+h/i,
  /a+[s\$@]+[s\$@]+h+o+l+e/i, /d+[i\*@1]+[c\*@]+k/i, /p+[u\*@]+[s\$]+[s\$]+y/i,
  /c+[u\*@]+n+t/i, /w+h+o+r+e/i, /s+l+u+t/i, /n+[i\*@1]+g+g/i, /f+a+g+/i,
  /r+e+t+a+r+d/i, /t+w+a+t/i, /w+a+n+k/i, /b+o+l+l+o+c+k/i, /a+r+s+e+/i,
  /p+r+[i\*@1]+c+k/i, /c+o+c+k/i, /t+[i\*@1]+t+s/i, /b+a+s+t+a+r+d/i,
  /d+a+m+n/i, /h+e+l+l+/i, /c+r+a+p/i, /p+[i\*@1]+s+s/i,
];

function containsProfanity(text) {
  const clean = text.replace(/[\s._\-]/g, '');
  return BLOCKED_PATTERNS.some(rx => rx.test(clean));
}

export function openSubmissionModal() {
  const { telescope, mount, camera } = state.currentSelections;
  if (!telescope || !mount || !camera) return;

  closeSubmissionModal();

  const nextNum = getNextRigNumber();
  modalOverlay = el('div', { className: 'submission-modal-overlay' });
  const modal = el('div', { className: 'submission-modal' });

  // ── Header ─────────────────────────────────────────────────────
  modal.appendChild(el('h3', {}, 'Submit Your Rig'));
  modal.appendChild(el('p', { className: 'submission-subtitle' }, 'Share your build with the community'));

  // ── Rig summary ────────────────────────────────────────────────
  const summary = el('div', { className: 'submission-summary' });
  const parts = [
    { emoji: '\u{1F52D}', sel: telescope },
    { emoji: '\u{1F916}', sel: mount },
    { emoji: '\u{1F4F7}', sel: camera },
  ];
  for (const p of parts) {
    summary.appendChild(
      el('div', { className: 'submission-summary-item' },
        el('span', {}, `${p.emoji} ${p.sel.name}`),
        el('span', { className: 'submission-item-price' }, formatPrice(p.sel.price)),
      ),
    );
  }
  summary.appendChild(
    el('div', { className: 'submission-summary-total' },
      el('span', {}, 'Total'),
      el('span', {}, formatPrice(telescope.price + mount.price + camera.price)),
    ),
  );
  modal.appendChild(summary);

  // ── Initials input ─────────────────────────────────────────────
  modal.appendChild(el('label', { className: 'submission-label' }, 'Your Initials'));
  const initialsInput = el('input', {
    className: 'submission-input',
    type: 'text',
    placeholder: 'e.g. DS',
    maxlength: '4',
    style: 'width:120px;text-align:center;text-transform:uppercase;font-size:1.1rem;font-weight:700;letter-spacing:3px;',
  });
  const charCount = el('div', { className: 'submission-char-count' }, '0 / 4');
  const errorMsg = el('div', { style: 'color:#ef4444;font-size:0.8rem;min-height:1.2em;margin-top:4px;' });
  initialsInput.addEventListener('input', () => {
    // Only allow letters
    initialsInput.value = initialsInput.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    charCount.textContent = `${initialsInput.value.length} / 4`;
    errorMsg.textContent = '';
  });
  modal.appendChild(initialsInput);
  modal.appendChild(charCount);
  modal.appendChild(errorMsg);

  // ── Actions ────────────────────────────────────────────────────
  const actions = el('div', { className: 'submission-actions' });

  const cancelBtn = el('button', { className: 'submission-btn-secondary' }, 'Cancel');
  cancelBtn.addEventListener('click', closeSubmissionModal);

  const submitBtn = el('button', { className: 'submission-btn-primary' }, 'Submit');
  submitBtn.addEventListener('click', async () => {
    const initials = initialsInput.value.trim().toUpperCase();

    if (!initials) {
      errorMsg.textContent = 'Please enter your initials.';
      return;
    }
    if (containsProfanity(initials)) {
      errorMsg.textContent = 'Inappropriate content detected.';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Capturing\u2026';

    try {
      const screenshot = await captureRigPreview();

      addSubmission({
        name: `Rig #${nextNum}`,
        username: initials,
        description: '',
        screenshot: screenshot || '',
        telescope: { id: telescope.id, name: telescope.name, price: telescope.price, affiliateUrl: telescope.affiliateUrl || '' },
        mount:     { id: mount.id,     name: mount.name,     price: mount.price,     affiliateUrl: mount.affiliateUrl || '' },
        camera:    { id: camera.id,    name: camera.name,    price: camera.price,    affiliateUrl: camera.affiliateUrl || '' },
        totalPrice: telescope.price + mount.price + camera.price,
      });

      refreshCarousel();
      closeSubmissionModal();
    } catch (err) {
      console.error('Submission failed:', err);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit';
    }
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(submitBtn);
  modal.appendChild(actions);

  modalOverlay.appendChild(modal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeSubmissionModal(); });
  document.body.appendChild(modalOverlay);
  initialsInput.focus();

  const onEsc = (e) => {
    if (e.key === 'Escape') { closeSubmissionModal(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
}

function closeSubmissionModal() {
  if (modalOverlay) { modalOverlay.remove(); modalOverlay = null; }
}
