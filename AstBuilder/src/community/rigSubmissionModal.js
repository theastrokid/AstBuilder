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

  // ── Username input ─────────────────────────────────────────────
  modal.appendChild(el('label', { className: 'submission-label' }, 'Your Name'));
  const usernameInput = el('input', {
    className: 'submission-input',
    type: 'text',
    placeholder: 'e.g. StarGazer_42',
    maxlength: '30',
  });
  modal.appendChild(usernameInput);

  // ── Name input ─────────────────────────────────────────────────
  modal.appendChild(el('label', { className: 'submission-label' }, 'Rig Name (optional)'));
  const nameInput = el('input', {
    className: 'submission-input',
    type: 'text',
    placeholder: `Rig #${nextNum}`,
  });
  modal.appendChild(nameInput);

  // ── Description textarea ───────────────────────────────────────
  modal.appendChild(el('label', { className: 'submission-label' }, 'Description (optional)'));
  const descArea = el('textarea', {
    className: 'submission-textarea',
    placeholder: 'Describe your build\u2026',
    maxlength: '140',
  });
  const charCount = el('div', { className: 'submission-char-count' }, '0 / 140');
  descArea.addEventListener('input', () => {
    charCount.textContent = `${descArea.value.length} / 140`;
  });
  modal.appendChild(descArea);
  modal.appendChild(charCount);

  // ── Actions ────────────────────────────────────────────────────
  const actions = el('div', { className: 'submission-actions' });

  const cancelBtn = el('button', { className: 'submission-btn-secondary' }, 'Cancel');
  cancelBtn.addEventListener('click', closeSubmissionModal);

  const submitBtn = el('button', { className: 'submission-btn-primary' }, 'Submit');
  submitBtn.addEventListener('click', async () => {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Capturing\u2026';

    try {
      const screenshot = await captureRigPreview();

      addSubmission({
        name: nameInput.value.trim() || `Rig #${nextNum}`,
        username: usernameInput.value.trim() || 'Anonymous',
        description: descArea.value.trim(),
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
  usernameInput.focus();

  const onEsc = (e) => {
    if (e.key === 'Escape') { closeSubmissionModal(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
}

function closeSubmissionModal() {
  if (modalOverlay) { modalOverlay.remove(); modalOverlay = null; }
}
