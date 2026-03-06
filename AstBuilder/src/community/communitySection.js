/**
 * Initialises the "Community Submissions" section at the bottom of the page.
 *
 * Renders:
 *  1. Section title + description
 *  2. "Submit My Rig" button (disabled when rig incomplete)
 *  3. Horizontal carousel of submitted rigs
 */

import { el } from '../dom.js';
import { state } from '../state.js';
import { createRigCarousel, refreshCarousel } from './rigCarousel.js';
import { openSubmissionModal } from './rigSubmissionModal.js';
import { upgradeSeedPreviews } from './communityStore.js';

let submitBtn = null;
let tooltip = null;

export function initCommunitySection() {
  const container = document.getElementById('community-section');
  if (!container) return;

  container.appendChild(el('h2', {}, 'Community Submissions'));
  container.appendChild(
    el('p', { className: 'community-description' },
      'Share your build with the community. Browse, rate, and buy rigs.'),
  );

  // Submit button + disabled-state tooltip
  const btnWrapper = el('div', { className: 'community-submit-wrapper' });

  submitBtn = el('button', { className: 'community-submit-btn' }, 'Submit My Rig');
  submitBtn.addEventListener('click', () => {
    if (isRigComplete()) openSubmissionModal();
  });

  tooltip = el('div', { className: 'community-submit-tooltip' }, 'Select a telescope, mount, and camera first');
  btnWrapper.appendChild(submitBtn);
  btnWrapper.appendChild(tooltip);
  container.appendChild(btnWrapper);

  // Carousel
  container.appendChild(createRigCarousel());

  // Set initial button state
  syncSubmitState();

  // Upgrade seed previews with real video frames in background
  upgradeSeedPreviews(() => refreshCarousel());
}

function isRigComplete() {
  const { telescope, mount, camera } = state.currentSelections;
  return !!(telescope && mount && camera);
}

function syncSubmitState() {
  if (!submitBtn) return;
  const ok = isRigComplete();
  submitBtn.disabled = !ok;
  tooltip.style.display = ok ? 'none' : 'block';
}

/** Call after every selection change so the button reflects the current state. */
export function updateCommunitySubmitState() {
  syncSubmitState();
}
