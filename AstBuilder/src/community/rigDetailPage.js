/**
 * Full-page detail view for a community-submitted rig.
 *
 * Shown when the URL hash matches  #/community/rig/:id
 * Replaces the main builder UI; a "Back" button restores it.
 */

import { el, clearChildren } from '../dom.js';
import { formatPrice } from '../state.js';
import { getSubmission, getAverageRating, addRating, hasUserRated } from './communityStore.js';
import { createRatingStars } from './ratingStars.js';

const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">' +
    '<rect fill="#1a2845" width="600" height="400"/>' +
    '<text fill="#5a9fd4" x="300" y="205" text-anchor="middle" font-size="18" font-family="sans-serif">No Preview Available</text>' +
    '</svg>',
)}`;

let detailContainer = null;

export function initDetailPage() {
  detailContainer = document.getElementById('rig-detail-page');
}

// ── Render ────────────────────────────────────────────────────────

export function renderRigDetailPage(id) {
  if (!detailContainer) initDetailPage();
  if (!detailContainer) return;

  const submission = getSubmission(id);
  if (!submission) { window.location.hash = ''; return; }

  clearChildren(detailContainer);

  const { average, count } = getAverageRating(id);
  const displayRating = count > 0 ? average : 3.0;
  const userRated = hasUserRated(id);

  // ── Back button ────────────────────────────────────────────────
  const backBtn = el('button', { className: 'rig-detail-back' }, '\u2190 Back to Builder');
  backBtn.addEventListener('click', () => { window.location.hash = ''; });
  detailContainer.appendChild(backBtn);

  // ── Two-column layout ──────────────────────────────────────────
  const content = el('div', { className: 'rig-detail-content' });

  // Left: screenshot
  const screenshotWrap = el('div', { className: 'rig-detail-screenshot' });
  screenshotWrap.appendChild(el('img', { src: submission.screenshot || PLACEHOLDER_IMG, alt: submission.name }));
  content.appendChild(screenshotWrap);

  // Right: info
  const info = el('div', { className: 'rig-detail-info' });

  info.appendChild(el('h2', { className: 'rig-detail-name' }, submission.name));
  if (submission.username) {
    info.appendChild(el('div', { className: 'rig-detail-username' }, `Submitted by ${submission.username}`));
  }
  if (submission.description) {
    info.appendChild(el('p', { className: 'rig-detail-description' }, submission.description));
  }

  // ── Rating section ─────────────────────────────────────────────
  const ratingSection = el('div', { className: 'rig-detail-rating-section' });
  ratingSection.appendChild(createRatingStars(displayRating, count));

  if (!userRated) {
    ratingSection.appendChild(el('div', { className: 'rig-detail-rate-label' }, 'Rate this rig:'));
    ratingSection.appendChild(
      createRatingStars(0, 0, {
        interactive: true,
        onRate: (value) => {
          addRating(id, value);
          renderRigDetailPage(id); // re-render to reflect update
        },
      }),
    );
  } else {
    ratingSection.appendChild(el('div', { className: 'rig-detail-rated' }, '\u2713 You rated this rig'));
  }
  info.appendChild(ratingSection);

  // ── Price breakdown ────────────────────────────────────────────
  const breakdown = el('div', { className: 'rig-detail-breakdown' });
  breakdown.appendChild(el('h3', {}, 'Price Breakdown'));

  const parts = [
    { emoji: '\u{1F52D}', label: 'Telescope', data: submission.telescope },
    { emoji: '\u{1F916}', label: 'Mount',     data: submission.mount },
    { emoji: '\u{1F4F7}', label: 'Camera',    data: submission.camera },
  ];
  for (const p of parts) {
    const row = el('div', { className: 'rig-detail-item' });
    row.appendChild(el('span', { className: 'rig-detail-item-name' }, `${p.emoji} ${p.data.name}`));
    const hasMissing = !p.data.price || p.data.price === 0;
    row.appendChild(
      el('span', { className: `rig-detail-item-price${hasMissing ? ' missing-price' : ''}` },
        hasMissing ? 'N/A' : formatPrice(p.data.price)),
    );
    breakdown.appendChild(row);
  }

  const totalRow = el('div', { className: 'rig-detail-total' });
  totalRow.appendChild(el('span', {}, 'Total'));
  totalRow.appendChild(el('span', {}, formatPrice(submission.totalPrice)));
  breakdown.appendChild(totalRow);
  info.appendChild(breakdown);

  // ── Buy button ─────────────────────────────────────────────────
  const buyBtn = el('button', { className: 'rig-detail-buy-btn' }, 'Buy This Rig');
  buyBtn.addEventListener('click', () => showBuyLinks(submission));
  info.appendChild(buyBtn);

  content.appendChild(info);
  detailContainer.appendChild(content);

  // Show detail / hide builder
  detailContainer.style.display = 'block';
  document.querySelector('.container').style.display = 'none';
  window.scrollTo(0, 0);
}

export function hideRigDetailPage() {
  if (detailContainer) detailContainer.style.display = 'none';
  document.querySelector('.container').style.display = 'block';
}

// ── Buy-links modal ──────────────────────────────────────────────
//
// Instead of opening multiple tabs (which would be blocked by popup blockers),
// we present a modal listing each affiliate link.  The user clicks each one
// individually — reliable across all browsers.

function showBuyLinks(submission) {
  const overlay = el('div', { className: 'submission-modal-overlay' });
  const modal = el('div', { className: 'buy-links-modal' });

  modal.appendChild(el('h3', {}, 'Buy Links'));
  modal.appendChild(el('p', { className: 'buy-links-note' }, 'Click each link to open in a new tab.'));

  const list = el('div', { className: 'buy-links-list' });
  const items = [
    { emoji: '\u{1F52D}', data: submission.telescope },
    { emoji: '\u{1F916}', data: submission.mount },
    { emoji: '\u{1F4F7}', data: submission.camera },
  ];

  for (const item of items) {
    const row = el('div', { className: 'buy-link-row' });
    row.appendChild(el('span', { className: 'buy-link-label' }, `${item.emoji} ${item.data.name}`));

    if (item.data.affiliateUrl) {
      row.appendChild(
        el('a', {
          className: 'buy-link-btn',
          href: item.data.affiliateUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
        }, 'Buy \u2192'),
      );
    } else {
      row.appendChild(el('span', { className: 'buy-link-na' }, 'No link available'));
    }
    list.appendChild(row);
  }
  modal.appendChild(list);

  const closeBtn = el('button', { className: 'submission-btn-secondary' }, 'Close');
  closeBtn.style.marginTop = '16px';
  closeBtn.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeBtn);

  overlay.appendChild(modal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);

  const onEsc = (e) => {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); }
  };
  document.addEventListener('keydown', onEsc);
}
