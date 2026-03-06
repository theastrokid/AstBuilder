/**
 * Horizontal snap-scroll carousel of community rig cards.
 *
 * - Mobile: swipe to scroll (arrows hidden).
 * - Desktop: left / right arrow buttons visible.
 * - Snap-scrolls to card boundaries.
 */

import { el, clearChildren } from '../dom.js';
import { getSubmissions } from './communityStore.js';
import { createRigCard } from './rigCard.js';

let carouselTrack = null;
let carouselContainer = null;

export function createRigCarousel() {
  const wrapper = el('div', { className: 'rig-carousel' });

  const leftArrow = el('button', { className: 'rig-carousel-arrow left', 'aria-label': 'Scroll left' }, '\u2039');
  const rightArrow = el('button', { className: 'rig-carousel-arrow right', 'aria-label': 'Scroll right' }, '\u203A');

  carouselContainer = el('div', { className: 'rig-carousel-container' });
  carouselTrack = el('div', { className: 'rig-carousel-track' });
  carouselContainer.appendChild(carouselTrack);

  const scrollPx = 280;
  leftArrow.addEventListener('click', () => carouselContainer.scrollBy({ left: -scrollPx, behavior: 'smooth' }));
  rightArrow.addEventListener('click', () => carouselContainer.scrollBy({ left: scrollPx, behavior: 'smooth' }));

  wrapper.appendChild(leftArrow);
  wrapper.appendChild(carouselContainer);
  wrapper.appendChild(rightArrow);

  populateCarousel();
  return wrapper;
}

function populateCarousel() {
  if (!carouselTrack) return;
  clearChildren(carouselTrack);

  const submissions = getSubmissions();

  if (submissions.length === 0) {
    carouselTrack.appendChild(
      el('div', { className: 'rig-carousel-empty' }, 'No community rigs yet. Be the first to submit!'),
    );
    return;
  }

  // Newest first
  for (const sub of [...submissions].reverse()) {
    carouselTrack.appendChild(createRigCard(sub));
  }
}

/** Re-render the carousel (call after a new submission). */
export function refreshCarousel() {
  populateCarousel();
}
