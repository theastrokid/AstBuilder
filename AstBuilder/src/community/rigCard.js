/**
 * Single rig card for the community carousel.
 */

import { el } from '../dom.js';
import { formatPrice } from '../state.js';
import { getAverageRating } from './communityStore.js';
import { createRatingStars } from './ratingStars.js';

const PLACEHOLDER_IMG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200">' +
    '<rect fill="#1a2845" width="300" height="200"/>' +
    '<text fill="#5a9fd4" x="150" y="105" text-anchor="middle" font-size="14" font-family="sans-serif">No Preview</text>' +
    '</svg>',
)}`;

export function createRigCard(submission) {
  const { average, count } = getAverageRating(submission.id);
  const displayRating = count > 0 ? average : 3.0;

  const card = el('div', {
    className: 'rig-card',
    role: 'button',
    tabindex: '0',
    'aria-label': `View ${submission.name}`,
  });

  // Thumbnail
  const thumb = el('div', { className: 'rig-card-thumbnail' });
  thumb.appendChild(
    el('img', { src: submission.screenshot || PLACEHOLDER_IMG, alt: submission.name }),
  );
  card.appendChild(thumb);

  // Info block
  const info = el('div', { className: 'rig-card-info' });
  info.appendChild(el('div', { className: 'rig-card-name' }, submission.name));
  if (submission.username) {
    info.appendChild(el('div', { className: 'rig-card-username' }, `by ${submission.username}`));
  }
  info.appendChild(el('div', { className: 'rig-card-price' }, formatPrice(submission.totalPrice)));
  info.appendChild(createRatingStars(displayRating, count, { compact: true }));
  info.appendChild(el('div', { className: 'rig-card-view' }, 'View \u2192'));
  card.appendChild(info);

  // Click / keyboard → navigate to detail page
  const navigate = () => {
    window.location.hash = `/community/rig/${submission.id}`;
  };
  card.addEventListener('click', navigate);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      navigate();
    }
  });

  return card;
}
