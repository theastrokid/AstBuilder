/**
 * Captures the current rig configuration as a compressed screenshot.
 *
 * Strategy: build an off-screen composite DOM node with video-frame snapshots
 * (videos can't be captured directly by html2canvas), then render it to a
 * JPEG data-URL.  This mirrors the approach already used by handleShareRig().
 */

import { state, formatPrice } from '../state.js';

/**
 * @returns {Promise<string|null>} JPEG data-URL, or null on failure.
 */
export async function captureRigPreview() {
  const { telescope, mount, camera } = state.currentSelections;
  if (!telescope || !mount || !camera) return null;

  try {
    const html2canvas = (await import('html2canvas')).default;

    // Grab the current video frame for each category
    const frames = {};
    for (const cat of ['telescope', 'mount', 'camera']) {
      const video = document.getElementById(`${cat}-video`);
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        const c = document.createElement('canvas');
        c.width = video.videoWidth;
        c.height = video.videoHeight;
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        frames[cat] = c.toDataURL('image/png');
      }
    }

    // Build off-screen wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = [
      'position:absolute', 'left:-9999px', 'top:0',
      'background:linear-gradient(135deg,#0a1628 0%,#1a2845 100%)',
      'padding:24px', 'border-radius:12px', 'width:720px',
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
    ].join(';');

    // 3-column product grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:16px;';

    const items = [
      { cat: 'telescope', emoji: '\u{1F52D}', label: 'Telescope', sel: telescope },
      { cat: 'mount',     emoji: '\u{1F916}', label: 'Mount',     sel: mount },
      { cat: 'camera',    emoji: '\u{1F4F7}', label: 'Camera',    sel: camera },
    ];

    for (const item of items) {
      const card = document.createElement('div');
      card.style.cssText = 'background:rgba(35,55,85,0.8);border-radius:8px;padding:12px;text-align:center;';

      const title = document.createElement('div');
      title.style.cssText = 'color:#5a9fd4;font-weight:600;font-size:13px;margin-bottom:8px;';
      title.textContent = `${item.emoji} ${item.label}`;
      card.appendChild(title);

      if (frames[item.cat]) {
        const img = document.createElement('img');
        img.src = frames[item.cat];
        img.style.cssText = 'width:100%;height:120px;object-fit:cover;border-radius:4px;margin-bottom:8px;';
        card.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.style.cssText = 'width:100%;height:120px;background:rgba(20,30,45,0.8);border-radius:4px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:36px;';
        ph.textContent = item.emoji;
        card.appendChild(ph);
      }

      const name = document.createElement('div');
      name.style.cssText = 'color:#e8edf3;font-size:12px;font-weight:600;';
      name.textContent = item.sel.name;
      card.appendChild(name);

      const price = document.createElement('div');
      price.style.cssText = 'color:#60a5fa;font-size:14px;font-weight:700;margin-top:4px;';
      price.textContent = formatPrice(item.sel.price);
      card.appendChild(price);

      grid.appendChild(card);
    }
    wrapper.appendChild(grid);

    // Total cost footer
    const total = document.createElement('div');
    total.style.cssText = 'text-align:center;margin-top:16px;padding:12px;background:rgba(35,55,85,0.9);border-radius:8px;';
    const tLabel = document.createElement('div');
    tLabel.style.cssText = 'color:#5a9fd4;font-size:12px;font-weight:600;';
    tLabel.textContent = 'Total Cost';
    total.appendChild(tLabel);
    const tValue = document.createElement('div');
    tValue.style.cssText = 'color:#28a745;font-size:22px;font-weight:700;';
    tValue.textContent = formatPrice(telescope.price + mount.price + camera.price);
    total.appendChild(tValue);
    wrapper.appendChild(total);

    document.body.appendChild(wrapper);
    await new Promise((r) => setTimeout(r, 150));

    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#0a1628',
      scale: 2,          // retina-crisp
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    document.body.removeChild(wrapper);

    // Convert to compressed JPEG data-URL (universally supported, small size)
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(null); return; }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.7,
      );
    });
  } catch (err) {
    console.error('Failed to capture rig preview:', err);
    return null; // caller will use placeholder
  }
}
