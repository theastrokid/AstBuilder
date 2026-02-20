/**
 * export.js — SVG and PDF export for Custom Star Map
 */

window.StarExport = (function () {

  // ── Paper sizes in mm ─────────────────────────────────────────────
  const MM_TO_PX_96 = 3.7795275591; // 96 DPI
  const PT_PER_MM   = 2.8346456693; // for jsPDF (points)

  // ── Download helper ───────────────────────────────────────────────
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function downloadDataURL(dataURL, filename) {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 500);
  }

  // ── SVG Export ───────────────────────────────────────────────────
  function exportSVG(svgString, filename) {
    filename = filename || 'starmap.svg';

    // Inject Google Fonts @import so exported SVG is self-aware
    const fontImport = `<defs><style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&amp;family=Cinzel:wght@400;600;700&amp;family=Montserrat:wght@300;400;500;600&amp;family=Playfair+Display:ital,wght@0,400;0,700;1,400&amp;family=Raleway:wght@300;400;500&amp;family=EB+Garamond:ital,wght@0,400;0,500;1,400&amp;family=Josefin+Sans:wght@300;400;600&amp;display=swap');
    </style></defs>`;

    // Insert after opening <svg tag
    const withFonts = svgString.replace(
      /(<svg[^>]*>)/,
      `$1\n${fontImport}`
    );

    const blob = new Blob([withFonts], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, filename);
  }

  // ── PDF Export ───────────────────────────────────────────────────
  async function exportPDF(svgString, state, filename) {
    filename = filename || 'starmap.pdf';

    // Get paper dimensions
    const sizeKey = state.size || '18x24';
    const SIZES = window.StarMap.PAPER_SIZES;
    let { w, h } = SIZES[sizeKey] || { w: 457.2, h: 609.6 };
    if (state.orientation === 'landscape') { [w, h] = [h, w]; }

    // jsPDF uses points internally; mm is the unit option
    if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      alert('jsPDF library not loaded. Please check your internet connection and reload.');
      return;
    }

    const jsPDFLib = window.jspdf ? window.jspdf.jsPDF : jsPDF;
    const orient   = state.orientation === 'landscape' ? 'landscape' : 'portrait';
    const doc      = new jsPDFLib({
      orientation: orient,
      unit:        'mm',
      format:      [w, h],
      compress:    true
    });

    // Convert SVG to canvas via a temporary img element, then embed as high-res bitmap.
    // For purely vector output we'd use svg2pdf.js — here we use canvas rasterization
    // at 300 DPI equivalent. Physical size stays correct because we scale to the exact mm.
    try {
      const pxW = Math.round(w * 11.811); // 300 DPI: 1mm = 300/25.4 px ≈ 11.811
      const pxH = Math.round(h * 11.811);

      const imgData = await svgToDataURL(svgString, pxW, pxH);
      doc.addImage(imgData, 'PNG', 0, 0, w, h, undefined, 'FAST');
      doc.save(filename);
    } catch (e) {
      console.error('PDF export error:', e);
      // Fallback: open SVG in new tab for manual print
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
      alert('PDF export failed — your browser may restrict canvas access. SVG opened in new tab for printing.');
    }
  }

  // ── SVG → Canvas → PNG DataURL ───────────────────────────────────
  function svgToDataURL(svgString, w, h) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url  = URL.createObjectURL(blob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        // Try base64 approach
        const b64 = btoa(unescape(encodeURIComponent(svgString)));
        const dataUri = 'data:image/svg+xml;base64,' + b64;
        const img2 = new Image();
        img2.onload = () => {
          ctx.drawImage(img2, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        };
        img2.onerror = reject;
        img2.src = dataUri;
      };

      img.src = url;
    });
  }

  // ── Generate share URL ────────────────────────────────────────────
  function buildShareURL(state) {
    const params = {};
    const keys = [
      'title','subtitle','date','time','timeMode','tzOffset',
      'lat','lon','locationName','size','orientation','theme',
      'font','border','starStyle','mapCenter','preset',
      'showConstLines','showConstNames','showStarNames','showGrid',
      'showCardinals','showEcliptic','showMilkyWay','showFaintStars',
      'showCoords','showDate','showSciFooter','showPlanets',
      'showSkyConditions','showDsoFooter','showQR',
      'dsoSeed'
    ];
    for (const k of keys) {
      const v = state[k];
      if (v !== undefined && v !== null && v !== '') {
        params[k] = String(v);
      }
    }
    const qs = new URLSearchParams(params).toString();
    return `${location.origin}${location.pathname}#${qs}`;
  }

  // ── Parse share URL ───────────────────────────────────────────────
  function parseShareURL() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) return null;
    const params = {};
    try {
      const up = new URLSearchParams(hash);
      const BOOL_KEYS = [
        'showConstLines','showConstNames','showStarNames','showGrid',
        'showCardinals','showEcliptic','showMilkyWay','showFaintStars',
        'showCoords','showDate','showSciFooter','showPlanets',
        'showSkyConditions','showDsoFooter','showQR'
      ];
      for (const [k, v] of up.entries()) {
        params[k] = BOOL_KEYS.includes(k) ? (v === 'true') : v;
      }
    } catch (e) { return null; }
    return Object.keys(params).length ? params : null;
  }

  // ── Generate QR code PNG dataURL ──────────────────────────────────
  function generateQR(url, size) {
    size = size || 128;
    if (typeof QRCode === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      QRCode.toCanvas(canvas, url, {
        width: size,
        margin: 1,
        color: { dark: '#ffffff', light: '#000000' }
      }, (err) => {
        if (err) { resolve(null); return; }
        resolve(canvas.toDataURL('image/png'));
      });
    });
  }

  // ── Render QR to visible canvas ───────────────────────────────────
  function renderQRToCanvas(url, canvasEl) {
    if (typeof QRCode === 'undefined' || !canvasEl) return;
    QRCode.toCanvas(canvasEl, url, {
      width: 100,
      margin: 1,
      color: { dark: '#ffffff', light: '#1a1f2e' }
    }, (err) => {
      if (!err) canvasEl.classList.remove('hidden');
    });
  }

  return {
    exportSVG,
    exportPDF,
    buildShareURL,
    parseShareURL,
    generateQR,
    renderQRToCanvas,
    svgToDataURL
  };

})();
