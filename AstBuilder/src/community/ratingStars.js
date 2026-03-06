/**
 * Star-rating component (display-only or interactive).
 */

import { el } from '../dom.js';

/**
 * @param {number} rating   - Current average (0–5).
 * @param {number} count    - Number of ratings received.
 * @param {Object} [opts]
 * @param {boolean} opts.interactive - Show clickable stars.
 * @param {Function} opts.onRate     - Callback(value) when user clicks.
 * @param {boolean} opts.compact     - Minimal display for card thumbnails.
 */
export function createRatingStars(rating, count, opts = {}) {
  const { interactive = false, onRate = null, compact = false } = opts;

  const container = el('div', { className: `rating-stars${compact ? ' rating-compact' : ''}` });
  const starsWrap = el('div', { className: 'stars-wrap' });

  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(rating);
    const star = el(
      'span',
      { className: `rating-star${filled ? ' filled' : ''}${interactive ? ' interactive' : ''}` },
      filled ? '\u2605' : '\u2606',
    );

    if (interactive && onRate) {
      star.addEventListener('mouseenter', () => {
        starsWrap.querySelectorAll('.rating-star').forEach((s, idx) => {
          const on = idx < i;
          s.textContent = on ? '\u2605' : '\u2606';
          s.classList.toggle('filled', on);
        });
      });
      star.addEventListener('click', () => onRate(i));
    }

    starsWrap.appendChild(star);
  }

  // Reset highlight when the mouse leaves the star row
  if (interactive) {
    starsWrap.addEventListener('mouseleave', () => {
      starsWrap.querySelectorAll('.rating-star').forEach((s, idx) => {
        const on = idx < Math.round(rating);
        s.textContent = on ? '\u2605' : '\u2606';
        s.classList.toggle('filled', on);
      });
    });
  }

  container.appendChild(starsWrap);

  if (!compact) {
    container.appendChild(el('span', { className: 'rating-value' }, rating.toFixed(1)));
    if (count > 0) {
      container.appendChild(
        el('span', { className: 'rating-count' }, `(${count} ${count === 1 ? 'rating' : 'ratings'})`),
      );
    }
  }

  return container;
}
