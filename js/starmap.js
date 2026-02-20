/**
 * starmap.js — SVG Star Map Renderer
 *
 * Generates a print-ready SVG from the current state object.
 * All poster elements are pure SVG vectors (fonts embedded via @font-face links).
 */

window.StarMap = (function () {

  // ── Paper sizes (mm) ─────────────────────────────────────────────
  const PAPER_SIZES = {
    '18x24':  { w: 457.2,  h: 609.6  },
    '24x36':  { w: 609.6,  h: 914.4  },
    'A4':     { w: 210,    h: 297    },
    'A3':     { w: 297,    h: 420    },
    'A2':     { w: 420,    h: 594    },
    'A1':     { w: 594,    h: 841    },
  };

  // ── Design Presets ────────────────────────────────────────────────
  const PRESETS = {
    'midnight-classic': {
      theme: 'midnight-blue', font: 'cinzel-garamond', border: 'thin',
      starStyle: 'realistic', showMilkyWay: true, showGrid: false,
      showConstLines: true, showConstNames: true, showCardinals: true
    },
    'gold-on-black': {
      theme: 'black-gold', font: 'cinzel-garamond', border: 'double',
      starStyle: 'fine-art', showMilkyWay: false, showGrid: false,
      showConstLines: true, showConstNames: false, showCardinals: false
    },
    'light-minimal': {
      theme: 'light', font: 'playfair-raleway', border: 'thin',
      starStyle: 'minimal', showMilkyWay: false, showGrid: false,
      showConstLines: false, showConstNames: false, showCardinals: true
    },
    'deep-cosmos': {
      theme: 'deep-cosmos', font: 'josefin-garamond', border: 'none',
      starStyle: 'realistic', showMilkyWay: true, showGrid: false,
      showConstLines: true, showConstNames: true, showCardinals: false
    },
    'navy-silver': {
      theme: 'navy', font: 'playfair-raleway', border: 'thin',
      starStyle: 'realistic', showMilkyWay: true, showGrid: false,
      showConstLines: true, showConstNames: true, showCardinals: true
    },
    'fine-art': {
      theme: 'warm-dark', font: 'cinzel-garamond', border: 'thick',
      starStyle: 'fine-art', showMilkyWay: true, showGrid: false,
      showConstLines: true, showConstNames: false, showCardinals: false
    },
    'arctic': {
      theme: 'minimal', font: 'josefin-garamond', border: 'thin',
      starStyle: 'minimal', showMilkyWay: false, showGrid: true,
      showConstLines: false, showConstNames: false, showCardinals: true
    },
    'rose-quartz': {
      theme: 'rose', font: 'playfair-raleway', border: 'double',
      starStyle: 'fine-art', showMilkyWay: false, showGrid: false,
      showConstLines: true, showConstNames: false, showCardinals: false
    }
  };

  // ── Color Themes ──────────────────────────────────────────────────
  const THEMES = {
    'midnight-blue': {
      bg:         '#0d1b2a',
      skyBg:      '#09131e',
      skyBg2:     '#06111a',
      stars:      '#e8f0ff',
      constLine:  'rgba(180,200,255,0.35)',
      constName:  'rgba(140,170,220,0.6)',
      grid:       'rgba(100,140,200,0.18)',
      ecliptic:   'rgba(255,180,60,0.45)',
      milkyway:   'rgba(100,130,200,0.10)',
      cardinal:   'rgba(200,220,255,0.55)',
      titleColor: '#e8f0ff',
      subColor:   '#8ab4d8',
      textColor:  '#6a8fb0',
      accentColor:'#c9a84c',
      borderColor:'rgba(150,180,255,0.3)',
      paperBg:    '#0d1b2a',
      fontWeight: '300',
      starBrightColor: '#ffffff',
    },
    'dark': {
      bg: '#111318', skyBg: '#0a0c12', skyBg2: '#060810',
      stars: '#e0e8f8', constLine: 'rgba(160,180,220,0.3)',
      constName: 'rgba(130,160,200,0.55)', grid: 'rgba(80,110,180,0.18)',
      ecliptic: 'rgba(255,170,50,0.4)', milkyway: 'rgba(80,100,160,0.10)',
      cardinal: 'rgba(180,200,240,0.5)', titleColor: '#e0e8f8',
      subColor: '#7a9ab8', textColor: '#5a7a98', accentColor: '#b89040',
      borderColor: 'rgba(120,150,220,0.25)', paperBg: '#111318',
      fontWeight: '300', starBrightColor: '#ffffff'
    },
    'black-gold': {
      bg: '#0a0a0a', skyBg: '#040406', skyBg2: '#020204',
      stars: '#f0e6c0', constLine: 'rgba(201,168,76,0.3)',
      constName: 'rgba(201,168,76,0.55)', grid: 'rgba(150,120,50,0.2)',
      ecliptic: 'rgba(255,200,80,0.5)', milkyway: 'rgba(150,120,60,0.12)',
      cardinal: 'rgba(201,168,76,0.6)', titleColor: '#e8d88a',
      subColor: '#c9a84c', textColor: '#8a7040', accentColor: '#c9a84c',
      borderColor: 'rgba(201,168,76,0.45)', paperBg: '#0a0a0a',
      fontWeight: '400', starBrightColor: '#fff8e0'
    },
    'light': {
      bg: '#f5f0ea', skyBg: '#f0eadd', skyBg2: '#e8dfd0',
      stars: '#2a3550', constLine: 'rgba(60,80,140,0.25)',
      constName: 'rgba(60,80,140,0.45)', grid: 'rgba(60,80,160,0.15)',
      ecliptic: 'rgba(180,100,20,0.4)', milkyway: 'rgba(100,120,200,0.08)',
      cardinal: 'rgba(60,80,140,0.5)', titleColor: '#1a2040',
      subColor: '#3a5080', textColor: '#6a7a9a', accentColor: '#8a6020',
      borderColor: 'rgba(60,80,140,0.25)', paperBg: '#f5f0ea',
      fontWeight: '400', starBrightColor: '#1a2040'
    },
    'minimal': {
      bg: '#fafafa', skyBg: '#f5f5f5', skyBg2: '#ebebeb',
      stars: '#2a2a2a', constLine: 'rgba(0,0,0,0.15)',
      constName: 'rgba(0,0,0,0.3)', grid: 'rgba(0,0,0,0.1)',
      ecliptic: 'rgba(100,60,0,0.3)', milkyway: 'rgba(0,0,0,0.05)',
      cardinal: 'rgba(0,0,0,0.35)', titleColor: '#1a1a1a',
      subColor: '#555555', textColor: '#888888', accentColor: '#555555',
      borderColor: 'rgba(0,0,0,0.2)', paperBg: '#fafafa',
      fontWeight: '400', starBrightColor: '#0a0a0a'
    },
    'deep-cosmos': {
      bg: '#03050d', skyBg: '#020408', skyBg2: '#010206',
      stars: '#c8d8f8', constLine: 'rgba(120,160,255,0.3)',
      constName: 'rgba(100,140,220,0.5)', grid: 'rgba(80,120,200,0.15)',
      ecliptic: 'rgba(255,180,60,0.4)', milkyway: 'rgba(60,90,200,0.12)',
      cardinal: 'rgba(160,190,255,0.5)', titleColor: '#c8d8f8',
      subColor: '#7090c0', textColor: '#405080', accentColor: '#8090c0',
      borderColor: 'rgba(100,140,240,0.3)', paperBg: '#03050d',
      fontWeight: '300', starBrightColor: '#ffffff'
    },
    'navy': {
      bg: '#1a2744', skyBg: '#131d36', skyBg2: '#0d1528',
      stars: '#d0dff8', constLine: 'rgba(180,210,255,0.3)',
      constName: 'rgba(180,200,240,0.5)', grid: 'rgba(150,180,230,0.18)',
      ecliptic: 'rgba(255,200,80,0.4)', milkyway: 'rgba(150,180,240,0.1)',
      cardinal: 'rgba(200,220,255,0.5)', titleColor: '#d8e8ff',
      subColor: '#90aad0', textColor: '#607090', accentColor: '#c0b060',
      borderColor: 'rgba(150,180,255,0.3)', paperBg: '#1a2744',
      fontWeight: '300', starBrightColor: '#ffffff'
    },
    'warm-dark': {
      bg: '#2c1810', skyBg: '#1a1008', skyBg2: '#110c06',
      stars: '#f0e8d0', constLine: 'rgba(220,180,120,0.3)',
      constName: 'rgba(200,160,100,0.5)', grid: 'rgba(180,140,80,0.18)',
      ecliptic: 'rgba(255,200,80,0.5)', milkyway: 'rgba(200,160,80,0.1)',
      cardinal: 'rgba(220,190,140,0.55)', titleColor: '#f0e8d0',
      subColor: '#c0a070', textColor: '#806040', accentColor: '#d4a040',
      borderColor: 'rgba(200,160,80,0.35)', paperBg: '#2c1810',
      fontWeight: '300', starBrightColor: '#fff8e0'
    },
    'rose': {
      bg: '#2a1520', skyBg: '#1c0d18', skyBg2: '#140a12',
      stars: '#f0d0e8', constLine: 'rgba(220,160,200,0.3)',
      constName: 'rgba(200,140,180,0.5)', grid: 'rgba(180,120,160,0.18)',
      ecliptic: 'rgba(255,180,140,0.45)', milkyway: 'rgba(180,100,160,0.1)',
      cardinal: 'rgba(220,180,210,0.5)', titleColor: '#f0d0e8',
      subColor: '#c090b0', textColor: '#806070', accentColor: '#d090a0',
      borderColor: 'rgba(200,140,180,0.35)', paperBg: '#2a1520',
      fontWeight: '300', starBrightColor: '#fff0f8'
    }
  };

  // ── Font Pairings ─────────────────────────────────────────────────
  const FONT_PAIRS = {
    'cinzel-garamond': {
      title:    "'Cinzel', 'Trajan Pro', serif",
      body:     "'Cormorant Garamond', 'Garamond', serif",
      mono:     "'Cormorant Garamond', serif",
      titleWeight: '600',
      bodyWeight:  '300',
    },
    'playfair-raleway': {
      title:    "'Playfair Display', 'Georgia', serif",
      body:     "'Raleway', 'Helvetica Neue', sans-serif",
      mono:     "'Raleway', sans-serif",
      titleWeight: '700',
      bodyWeight:  '300',
    },
    'josefin-garamond': {
      title:    "'Josefin Sans', 'Futura', sans-serif",
      body:     "'EB Garamond', 'Garamond', serif",
      mono:     "'Josefin Sans', sans-serif",
      titleWeight: '600',
      bodyWeight:  '400',
    }
  };

  // ── Star spectral colors ──────────────────────────────────────────
  const SPECTRAL_COLORS = {
    'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad7ff',
    'F': '#f8f7ff', 'G': '#fff4ea', 'K': '#ffd2a1', 'M': '#ffad80'
  };

  // ── Milky Way band (rough equatorial coords, smoothed path) ──────
  // Pre-calculated set of (ra, dec) points tracing the galactic plane
  const MILKY_WAY_SPINE = [
    // (RA hours, Dec deg) — galactic plane b=0 in equatorial coords
    [17.75,-28.9],[18.0,-23.5],[18.5,-15.0],[19.0,-5.0],[19.5,3.5],
    [20.0,10.0],[20.5,16.0],[21.0,20.0],[21.5,22.0],[22.0,22.5],
    [22.5,21.0],[23.0,18.5],[23.5,15.0],[0.0,11.0],[0.5,7.0],
    [1.0,3.0],[1.5,-1.0],[2.0,-5.0],[2.5,-9.5],[3.0,-14.0],
    [3.5,-18.0],[4.0,-22.0],[4.5,-24.0],[5.0,-26.5],[5.5,-27.0],
    [6.0,-26.5],[6.5,-25.0],[7.0,-22.0],[7.5,-18.0],[8.0,-13.0],
    [8.5,-8.0],[9.0,-2.0],[9.5,3.5],[10.0,8.5],[10.5,12.0],
    [11.0,14.5],[11.5,16.0],[12.0,16.5],[12.5,15.5],[13.0,13.5],
    [13.5,10.0],[14.0,5.5],[14.5,0.0],[15.0,-6.5],[15.5,-14.0],
    [16.0,-21.5],[16.5,-27.0],[17.0,-29.5],[17.5,-29.5],[17.75,-28.9]
  ];

  // ── Magnitude → star radius ───────────────────────────────────────
  function magToRadius(mag, style, scale) {
    scale = scale || 1;
    const base = style === 'fine-art' ? 1.15 : (style === 'minimal' ? 0.85 : 1.0);
    // Exponential scaling: very bright stars much larger
    const r = base * scale * Math.pow(2, (1.5 - mag) / 2.0);
    return Math.max(0.15, Math.min(r, style === 'fine-art' ? 8 : 6));
  }

  // ── Helper: SVG path from points array ───────────────────────────
  function polyPath(pts, close) {
    if (!pts || pts.length < 2) return '';
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
    }
    if (close) d += ' Z';
    return d;
  }

  // ── Helper: smooth bezier through points ─────────────────────────
  function smoothPath(pts) {
    if (!pts || pts.length < 3) return polyPath(pts, false);
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i].x + pts[i+1].x) / 2;
      const my = (pts[i].y + pts[i+1].y) / 2;
      d += ` Q ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length-1].x.toFixed(1)} ${pts[pts.length-1].y.toFixed(1)}`;
    return d;
  }

  // ── Format date string for display ───────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr12 = h % 12 || 12;
    return `${hr12}:${String(m).padStart(2,'0')} ${ampm}`;
  }

  // ── Moon Phase SVG icon ───────────────────────────────────────────
  function moonIcon(phase_angle, r, cx, cy, color) {
    const p = phase_angle;
    // Draw moon as illuminated crescent/circle
    if (p < 15 || p > 345) {
      // New moon: thin ring
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="1"/>`;
    }
    if (p > 165 && p < 195) {
      // Full moon: filled circle
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.9"/>`;
    }
    // Crescent/gibbous: clip-path approach
    const waxing = p < 180;
    const ang    = ((p > 90 && p < 270) ? (180 - p) : p) * Math.PI / 180;
    const k      = Math.cos(ang) * r;
    // Outer circle filled, inner ellipse cuts
    const id = `mc${Math.round(cx)}_${Math.round(cy)}`;
    const rx = Math.abs(k);
    if (waxing) {
      // Right side lit (waxing)
      return `<defs>
        <clipPath id="${id}">
          <rect x="${cx}" y="${cy - r - 1}" width="${r + 2}" height="${2*r + 2}"/>
        </clipPath>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.85"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${r}" fill="${p < 90 ? THEMES['dark'].skyBg : color}" fill-opacity="0.9" clip-path="url(#${id})"/>`;
    } else {
      return `<defs>
        <clipPath id="${id}">
          <rect x="${cx - r - 1}" y="${cy - r - 1}" width="${r + 2}" height="${2*r + 2}"/>
        </clipPath>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" fill-opacity="0.85"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${r}" fill="${p > 270 ? THEMES['dark'].skyBg : color}" fill-opacity="0.9" clip-path="url(#${id})"/>`;
    }
  }

  // ── Planet icons ─────────────────────────────────────────────────
  const PLANET_ICONS = {
    'Mercury': '☿', 'Venus': '♀', 'Mars': '♂',
    'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '⛢', 'Neptune': '♆'
  };

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER FUNCTION
  // ═══════════════════════════════════════════════════════════════
  function render(state) {
    const theme   = THEMES[state.theme] || THEMES['midnight-blue'];
    const fonts   = FONT_PAIRS[state.font] || FONT_PAIRS['cinzel-garamond'];
    const preset  = PRESETS[state.preset] || {};

    // Paper dimensions
    const sizeKey = state.size || '18x24';
    let paper = { ...PAPER_SIZES[sizeKey] };
    if (state.orientation === 'landscape') {
      [paper.w, paper.h] = [paper.h, paper.w];
    }

    const W = paper.w; // mm
    const H = paper.h;

    // Layout margins (mm)
    const margX = W * 0.055;
    const margT = H * 0.045;
    const margB = H * 0.035;

    // Title zone
    const titleH = H * 0.12;

    // Footer zones
    const hasSciFoot  = state.showSciFooter;
    const hasDSO      = state.showDsoFooter && state.dsos && state.dsos.length > 0;
    const hasPlanets  = state.showPlanets;
    const hasSkyNote  = state.showSkyConditions;

    let footerH = 0;
    if (hasDSO)     footerH += H * 0.13;
    if (hasPlanets) footerH += H * 0.05;
    if (hasSciFoot) footerH += H * 0.04;
    if (hasSkyNote) footerH += H * 0.025;

    // Sky circle
    const circleAvailH = H - margT - titleH - footerH - margB;
    const circleAvailW = W - 2 * margX;
    const mapR = Math.min(circleAvailW, circleAvailH) / 2 * 0.97;
    const mapCX = W / 2;
    const mapCY = margT + titleH + circleAvailH / 2;

    // Scale factor: SVG is in mm, but we want fine lines
    // We'll output SVG in mm with viewBox in mm
    const svgScale = 1; // 1 SVG unit = 1 mm

    // Date object
    const dateObj = buildDateObject(state);

    let svg = buildSVG(state, theme, fonts, W, H, mapCX, mapCY, mapR,
                       titleH, footerH, margX, margT, margB, dateObj);
    return svg;
  }

  function buildDateObject(state) {
    if (!state.date) return new Date();
    let timeStr = '22:00';
    if (state.timeMode === 'exact' && state.time) {
      timeStr = state.time;
    } else if (state.timeMode === 'evening') {
      timeStr = '22:00';
    }
    // Build UTC date accounting for timezone offset
    const [h, m] = timeStr.split(':').map(Number);
    const dt = new Date(state.date);
    dt.setHours(h, m, 0, 0);
    // Adjust by timezone offset (state.tzOffset in hours, + = ahead of UTC)
    const tzOffset = parseFloat(state.tzOffset || 0);
    return new Date(dt.getTime() - tzOffset * 3600000);
  }

  // ── Build full SVG ────────────────────────────────────────────────
  function buildSVG(state, theme, fonts, W, H, cx, cy, R,
                    titleH, footerH, margX, margT, margB, dateObj) {

    const isSouth   = state.mapCenter === 'south';
    const isPolar   = state.mapCenter === 'north' || state.mapCenter === 'south';
    const lat       = parseFloat(state.lat) || 40.71;
    const lon       = parseFloat(state.lon) || -74.01;
    const magLimit  = state.showFaintStars ? 7.0 : 6.2;
    const starScale = R / 150; // relative to typical 150mm radius

    const els = []; // SVG element strings

    // ── Defs ──────────────────────────────────────────────────────
    els.push(`<defs>`);

    // Sky gradient
    els.push(`<radialGradient id="skyGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%"   stop-color="${theme.skyBg}"/>
      <stop offset="100%" stop-color="${theme.skyBg2}"/>
    </radialGradient>`);

    // Star glow filter
    if (state.starStyle === 'fine-art') {
      els.push(`<filter id="starGlow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`);
    }

    // Clip to sky circle
    els.push(`<clipPath id="skyClip">
      <circle cx="${cx}" cy="${cy}" r="${R}"/>
    </clipPath>`);

    // Milky Way gradient (faint band)
    els.push(`<radialGradient id="mwGrad" cx="50%" cy="30%" r="60%">
      <stop offset="0%"   stop-color="${theme.milkyway}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${theme.milkyway}" stop-opacity="0"/>
    </radialGradient>`);

    els.push(`</defs>`);

    // ── Paper background ──────────────────────────────────────────
    els.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${theme.paperBg}"/>`);

    // ── Border ───────────────────────────────────────────────────
    if (state.border && state.border !== 'none') {
      const bw   = state.border === 'thin' ? 0.4 : state.border === 'thick' ? 1.2 : 0.6;
      const inset = 2;
      if (state.border === 'double') {
        els.push(`<rect x="${inset}" y="${inset}" width="${W-2*inset}" height="${H-2*inset}"
          fill="none" stroke="${theme.borderColor}" stroke-width="${bw}"/>`);
        els.push(`<rect x="${inset+1.5}" y="${inset+1.5}" width="${W-2*(inset+1.5)}" height="${H-2*(inset+1.5)}"
          fill="none" stroke="${theme.borderColor}" stroke-width="${bw*0.6}"/>`);
      } else {
        els.push(`<rect x="${inset}" y="${inset}" width="${W-2*inset}" height="${H-2*inset}"
          fill="none" stroke="${theme.borderColor}" stroke-width="${bw}"/>`);
      }
    }

    // ── Sky circle background ─────────────────────────────────────
    els.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#skyGrad)"/>`);

    // ── Milky Way shading ─────────────────────────────────────────
    if (state.showMilkyWay) {
      els.push(renderMilkyWay(state, theme, cx, cy, R, dateObj, lat, lon, isPolar, isSouth));
    }

    // ── Grid ──────────────────────────────────────────────────────
    if (state.showGrid) {
      els.push(renderGrid(state, theme, cx, cy, R, dateObj, lat, lon, isPolar, isSouth));
    }

    // ── Constellation lines ───────────────────────────────────────
    if (state.showConstLines && window.CONSTELLATION_LINES) {
      els.push(renderConstellationLines(state, theme, cx, cy, R, dateObj, lat, lon, isPolar, isSouth, magLimit));
    }

    // ── Ecliptic line ─────────────────────────────────────────────
    if (state.showEcliptic) {
      els.push(renderEcliptic(state, theme, cx, cy, R, dateObj, lat, lon, isPolar, isSouth));
    }

    // ── Stars ─────────────────────────────────────────────────────
    if (window.STAR_CATALOG) {
      els.push(renderStars(state, theme, cx, cy, R, dateObj, lat, lon,
                           isPolar, isSouth, magLimit, starScale));
    }

    // ── Constellation names ───────────────────────────────────────
    if (state.showConstNames && window.CONSTELLATION_LINES) {
      els.push(renderConstellationNames(state, theme, fonts, cx, cy, R, dateObj, lat, lon, isPolar, isSouth));
    }

    // ── Cardinal directions ───────────────────────────────────────
    if (state.showCardinals) {
      els.push(renderCardinals(state, theme, fonts, cx, cy, R, isPolar, isSouth));
    }

    // ── Sky circle rim ────────────────────────────────────────────
    els.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
      stroke="${theme.borderColor}" stroke-width="${0.3}"/>`);

    // ── Title block ───────────────────────────────────────────────
    els.push(renderTitle(state, theme, fonts, W, H, margT, margX, titleH, R, cx, cy, dateObj));

    // ── Footers ───────────────────────────────────────────────────
    let footerY = cy + R + (H - cy - R - footerH) / 2;

    if (hasDSOFooter(state)) {
      els.push(renderDSOFooter(state, theme, fonts, W, margX, footerY));
      footerY += H * 0.13;
    }

    if (state.showPlanets) {
      els.push(renderPlanetStrip(state, theme, fonts, W, margX, footerY, dateObj, lat, lon));
      footerY += H * 0.05;
    }

    if (state.showSciFooter) {
      els.push(renderSciFooter(state, theme, fonts, W, margX, footerY, dateObj, lat, lon));
      footerY += H * 0.04;
    }

    if (state.showSkyConditions) {
      els.push(renderSkyNote(state, theme, fonts, W, margX, footerY, dateObj, lat, lon));
    }

    // ── QR code placeholder ───────────────────────────────────────
    if (state.showQR && state.qrDataUrl) {
      const qrS = R * 0.18;
      els.push(`<image href="${state.qrDataUrl}"
        x="${cx + R - qrS - 2}" y="${cy + R - qrS - 2}"
        width="${qrS}" height="${qrS}" opacity="0.75"/>`);
    }

    // ── "All-night blend" label ───────────────────────────────────
    if (state.timeMode === 'allnight') {
      const lfs = R * 0.045;
      els.push(`<text x="${cx}" y="${cy - R - 3}"
        font-family="${fonts.body}" font-size="${lfs}" fill="${theme.textColor}"
        text-anchor="middle" font-style="italic" letter-spacing="0.03em">
        Representative sky for the night
      </text>`);
    }

    // Assemble SVG
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}"
      width="${W.toFixed(2)}mm" height="${H.toFixed(2)}mm"
      style="background:${theme.paperBg}; font-smoothing:antialiased;">
      ${els.join('\n')}
    </svg>`;

    return svgStr;
  }

  // ── Render helpers ────────────────────────────────────────────────

  function projectPoint(ra_deg, dec_deg, dateObj, lat, lon, cx, cy, R, isPolar, isSouth) {
    if (isPolar) {
      return AstroCalc.projectPolar(ra_deg, dec_deg, dateObj, lat, lon, cx, cy, R, isSouth);
    }
    return AstroCalc.projectStar(ra_deg, dec_deg, dateObj, lat, lon, cx, cy, R,
      { projection: 'azeq', minAlt: -5, flip: false });
  }

  // ── Stars ─────────────────────────────────────────────────────────
  function renderStars(state, theme, cx, cy, R, dateObj, lat, lon,
                       isPolar, isSouth, magLimit, starScale) {
    const els = [`<g clip-path="url(#skyClip)" id="stars">`];
    const catalog = window.STAR_CATALOG;
    const glowFilt = state.starStyle === 'fine-art' ? ' filter="url(#starGlow)"' : '';
    const starNames = new Map(); // hip_id → name

    for (const star of catalog) {
      const [hip, ra_h, dec, mag, name, spec] = star;
      if (mag > magLimit) continue;

      const ra_deg = ra_h * 15;
      const pt = projectPoint(ra_deg, dec, dateObj, lat, lon, cx, cy, R, isPolar, isSouth);
      if (!pt) continue;

      // Check inside circle
      const dx = pt.x - cx, dy = pt.y - cy;
      if (dx*dx + dy*dy > R*R * 1.01) continue;

      const r   = magToRadius(mag, state.starStyle, starScale);
      let color = theme.stars;

      if (state.starStyle === 'realistic' && spec) {
        color = SPECTRAL_COLORS[spec] || theme.stars;
        // Blend toward theme star color for faint stars
        if (mag > 4) {
          const blend = (mag - 4) / 2;
          color = theme.stars; // simplify for faint stars
        }
      } else if (state.starStyle !== 'minimal' && spec) {
        color = SPECTRAL_COLORS[spec] || theme.stars;
      }

      // Glow for bright stars (fine-art / realistic)
      if (state.starStyle !== 'minimal' && mag < 2.0) {
        const gr = r * 2.5;
        els.push(`<circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="${gr.toFixed(2)}"
          fill="${color}" fill-opacity="${0.12 - mag*0.01}" />`);
        if (mag < 0.5) {
          const gr2 = r * 4;
          els.push(`<circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="${gr2.toFixed(2)}"
            fill="${color}" fill-opacity="0.06"/>`);
        }
      }

      els.push(`<circle cx="${pt.x.toFixed(2)}" cy="${pt.y.toFixed(2)}" r="${r.toFixed(2)}"
        fill="${color}"${glowFilt}/>`);

      if (name && state.showStarNames && mag < 2.5) {
        starNames.set(hip, { x: pt.x, y: pt.y, name, mag });
      }
    }

    els.push(`</g>`);

    // Star name labels
    if (state.showStarNames && starNames.size > 0) {
      const fonts_pair = FONT_PAIRS[state.font] || FONT_PAIRS['cinzel-garamond'];
      const labelEls = [`<g id="star-labels">`];
      for (const [, s] of starNames) {
        const fs = Math.max(1.8, 3.2 - s.mag * 0.4) * (R/150);
        labelEls.push(`<text x="${(s.x + R*0.025).toFixed(2)}" y="${(s.y - R*0.015).toFixed(2)}"
          font-family="${fonts_pair.body}" font-size="${fs.toFixed(2)}"
          fill="${theme.constName}" text-anchor="start" font-style="italic">${s.name}</text>`);
      }
      labelEls.push(`</g>`);
      els.push(labelEls.join('\n'));
    }

    return els.join('\n');
  }

  // ── Constellation lines ───────────────────────────────────────────
  function renderConstellationLines(state, theme, cx, cy, R, dateObj, lat, lon,
                                     isPolar, isSouth, magLimit) {
    if (!window.CONSTELLATION_LINES || !window.STAR_CATALOG) return '';

    // Build hip_id → coords map
    const hipMap = new Map();
    for (const star of window.STAR_CATALOG) {
      const [hip, ra_h, dec, mag] = star;
      if (hip > 0) hipMap.set(hip, { ra: ra_h * 15, dec });
    }

    const els = [`<g clip-path="url(#skyClip)" id="const-lines" opacity="0.9">`];

    for (const [abbr, segments] of Object.entries(window.CONSTELLATION_LINES)) {
      for (const [h1, h2] of segments) {
        const s1 = hipMap.get(h1);
        const s2 = hipMap.get(h2);
        if (!s1 || !s2) continue;

        const p1 = projectPoint(s1.ra, s1.dec, dateObj, lat, lon, cx, cy, R, isPolar, isSouth);
        const p2 = projectPoint(s2.ra, s2.dec, dateObj, lat, lon, cx, cy, R, isPolar, isSouth);
        if (!p1 || !p2) continue;

        // Skip if both stars are far outside circle
        const d1 = Math.sqrt((p1.x-cx)**2 + (p1.y-cy)**2);
        const d2 = Math.sqrt((p2.x-cx)**2 + (p2.y-cy)**2);
        if (d1 > R * 1.05 && d2 > R * 1.05) continue;

        const lw = (R / 150) * 0.35;
        els.push(`<line x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}"
          x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}"
          stroke="${theme.constLine}" stroke-width="${lw.toFixed(2)}"
          stroke-linecap="round"/>`);
      }
    }

    els.push(`</g>`);
    return els.join('\n');
  }

  // ── Constellation names ────────────────────────────────────────────
  const CONST_NAME_POSITIONS = {
    // IAU abbr: [ra_hours, dec_deg] — approximate centroid
    'And':[1.0,37],'Ant':[10.5,-30],'Aps':[16.0,-75],'Aql':[19.5,5],
    'Aqr':[22.5,-13],'Ara':[17.5,-57],'Ari':[2.5,20],'Aur':[6.0,42],
    'Boo':[14.7,28],'Cae':[4.7,-38],'Cam':[5.5,70],'Cap':[21.0,-18],
    'Car':[9.0,-63],'Cas':[1.0,62],'Cen':[13.0,-47],'Cep':[22.0,70],
    'Cet':[1.7,-10],'Cha':[10.5,-79],'Cir':[15.0,-63],'CMa':[6.9,-27],
    'CMi':[7.6,6],'Cnc':[8.5,20],'Col':[5.8,-35],'Com':[12.8,22],
    'CrA':[18.7,-41],'CrB':[15.7,32],'Crv':[12.5,-18],'Crt':[11.4,-15],
    'Cru':[12.5,-60],'CVn':[13.1,42],'Cyg':[20.7,44],'Del':[20.7,12],
    'Dor':[5.5,-60],'Dra':[17.0,65],'Equ':[21.2,8],'Eri':[3.0,-28],
    'For':[2.8,-30],'Gem':[7.1,23],'Gru':[22.5,-47],'Her':[17.0,28],
    'Hor':[3.3,-53],'Hya':[11.5,-19],'Hyi':[2.2,-70],'Ind':[21.5,-58],
    'Lac':[22.5,46],'Leo':[10.7,13],'Lep':[5.6,-20],'Lib':[15.1,-15],
    'LMi':[10.2,33],'Lup':[15.3,-45],'Lyn':[7.5,48],'Lyr':[18.9,37],
    'Men':[5.5,-78],'Mic':[21.0,-37],'Mon':[7.5,-4],'Mus':[12.5,-68],
    'Nor':[16.0,-52],'Oct':[22.0,-83],'Oph':[17.0,-7],'Ori':[5.6,0],
    'Pav':[19.5,-65],'Peg':[22.6,19],'Per':[3.3,45],'Phe':[1.0,-48],
    'Pic':[5.7,-53],'PsA':[22.9,-32],'Psc':[0.5,14],'Pup':[7.8,-33],
    'Pyx':[9.0,-28],'Ret':[4.0,-63],'Scl':[0.5,-32],'Sco':[16.9,-26],
    'Sct':[18.7,-10],'Ser':[16.5,9],'Sex':[10.2,-4],'Sge':[19.7,18],
    'Sgr':[19.0,-25],'Tau':[4.7,16],'Tel':[19.0,-52],'TrA':[16.0,-65],
    'Tri':[2.2,31],'Tuc':[23.5,-66],'UMa':[11.3,56],'UMi':[15.0,77],
    'Vel':[9.5,-47],'Vir':[13.4,-3],'Vol':[7.8,-70],'Vul':[20.3,24]
  };

  const CONST_FULL_NAMES = {
    'And':'Andromeda','Ant':'Antlia','Aps':'Apus','Aql':'Aquila',
    'Aqr':'Aquarius','Ara':'Ara','Ari':'Aries','Aur':'Auriga',
    'Boo':'Boötes','Cae':'Caelum','Cam':'Camelopardalis','Cap':'Capricornus',
    'Car':'Carina','Cas':'Cassiopeia','Cen':'Centaurus','Cep':'Cepheus',
    'Cet':'Cetus','Cha':'Chamaeleon','Cir':'Circinus','CMa':'Canis Major',
    'CMi':'Canis Minor','Cnc':'Cancer','Col':'Columba','Com':'Coma Berenices',
    'CrA':'Corona Australis','CrB':'Corona Borealis','Crv':'Corvus','Crt':'Crater',
    'Cru':'Crux','CVn':'Canes Venatici','Cyg':'Cygnus','Del':'Delphinus',
    'Dor':'Dorado','Dra':'Draco','Equ':'Equuleus','Eri':'Eridanus',
    'For':'Fornax','Gem':'Gemini','Gru':'Grus','Her':'Hercules',
    'Hor':'Horologium','Hya':'Hydra','Hyi':'Hydrus','Ind':'Indus',
    'Lac':'Lacerta','Leo':'Leo','Lep':'Lepus','Lib':'Libra',
    'LMi':'Leo Minor','Lup':'Lupus','Lyn':'Lynx','Lyr':'Lyra',
    'Men':'Mensa','Mic':'Microscopium','Mon':'Monoceros','Mus':'Musca',
    'Nor':'Norma','Oct':'Octans','Oph':'Ophiuchus','Ori':'Orion',
    'Pav':'Pavo','Peg':'Pegasus','Per':'Perseus','Phe':'Phoenix',
    'Pic':'Pictor','PsA':'Piscis Austrinus','Psc':'Pisces','Pup':'Puppis',
    'Pyx':'Pyxis','Ret':'Reticulum','Scl':'Sculptor','Sco':'Scorpius',
    'Sct':'Scutum','Ser':'Serpens','Sex':'Sextans','Sge':'Sagitta',
    'Sgr':'Sagittarius','Tau':'Taurus','Tel':'Telescopium','TrA':'Triangulum Australe',
    'Tri':'Triangulum','Tuc':'Tucana','UMa':'Ursa Major','UMi':'Ursa Minor',
    'Vel':'Vela','Vir':'Virgo','Vol':'Volans','Vul':'Vulpecula'
  };

  function renderConstellationNames(state, theme, fonts, cx, cy, R, dateObj, lat, lon, isPolar, isSouth) {
    const els = [`<g id="const-names">`];
    const fs = (R / 150) * 3.2;

    for (const [abbr, [ra_h, dec]] of Object.entries(CONST_NAME_POSITIONS)) {
      const pt = projectPoint(ra_h * 15, dec, dateObj, lat, lon, cx, cy, R, isPolar, isSouth);
      if (!pt) continue;
      const dx = pt.x - cx, dy = pt.y - cy;
      if (dx*dx + dy*dy > (R*0.92)**2) continue;

      const name = CONST_FULL_NAMES[abbr] || abbr;
      els.push(`<text x="${pt.x.toFixed(2)}" y="${pt.y.toFixed(2)}"
        font-family="${fonts.body}" font-size="${fs.toFixed(2)}" font-weight="300"
        fill="${theme.constName}" text-anchor="middle" dominant-baseline="middle"
        letter-spacing="0.12em" text-transform="uppercase"
        style="text-transform:uppercase">${name.toUpperCase()}</text>`);
    }

    els.push(`</g>`);
    return els.join('\n');
  }

  // ── Grid ──────────────────────────────────────────────────────────
  function renderGrid(state, theme, cx, cy, R, dateObj, lat, lon, isPolar, isSouth) {
    const els = [`<g clip-path="url(#skyClip)" id="grid" opacity="0.7">`];
    const lw = (R/150) * 0.25;

    if (isPolar) {
      // Dec circles
      for (let dec = -80; dec <= 80; dec += 30) {
        if (isSouth && dec < -80) continue;
        const pts = [];
        for (let ra = 0; ra <= 360; ra += 5) {
          const pt = AstroCalc.projectPolar(ra, dec, dateObj, lat, lon, cx, cy, R, isSouth);
          if (pt) pts.push(pt);
        }
        if (pts.length > 3) {
          els.push(`<path d="${polyPath(pts, true)}" fill="none" stroke="${theme.grid}" stroke-width="${lw}"/>`);
        }
      }
      // RA lines
      for (let ra = 0; ra < 360; ra += 30) {
        const pts = [];
        for (let dec = isSouth ? -90 : -30; dec <= (isSouth ? 30 : 90); dec += 5) {
          const pt = AstroCalc.projectPolar(ra, dec, dateObj, lat, lon, cx, cy, R, isSouth);
          if (pt) pts.push(pt);
        }
        if (pts.length > 2) {
          els.push(`<path d="${polyPath(pts, false)}" fill="none" stroke="${theme.grid}" stroke-width="${lw}"/>`);
        }
      }
    } else {
      // Altitude circles at 30°, 60°
      for (const alt of [30, 60]) {
        const r = (90 - alt) / 90 * R;
        els.push(`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none"
          stroke="${theme.grid}" stroke-width="${lw}"/>`);
      }
      // Azimuth lines at 30° intervals
      for (let az = 0; az < 360; az += 30) {
        const az_rad = az * Math.PI / 180;
        els.push(`<line x1="${cx.toFixed(2)}" y1="${cy.toFixed(2)}"
          x2="${(cx + R * Math.sin(az_rad)).toFixed(2)}"
          y2="${(cy - R * Math.cos(az_rad)).toFixed(2)}"
          stroke="${theme.grid}" stroke-width="${lw}" stroke-dasharray="${(R/150)*1.5} ${(R/150)*2}"/>`);
      }
    }

    els.push(`</g>`);
    return els.join('\n');
  }

  // ── Ecliptic ──────────────────────────────────────────────────────
  function renderEcliptic(state, theme, cx, cy, R, dateObj, lat, lon, isPolar, isSouth) {
    const pts = AstroCalc.eclipticPoints(dateObj, lat, lon, cx, cy, R,
      isPolar ? (isSouth ? 'south' : 'north') : 'zenith', isSouth);

    // Split into segments (break when jump > 20% of radius)
    const segments = [];
    let cur = [];
    for (let i = 0; i < pts.length; i++) {
      if (cur.length > 0) {
        const last = cur[cur.length - 1];
        const d = Math.sqrt((pts[i].x - last.x)**2 + (pts[i].y - last.y)**2);
        if (d > R * 0.2) {
          if (cur.length > 2) segments.push(cur);
          cur = [];
        }
      }
      cur.push(pts[i]);
    }
    if (cur.length > 2) segments.push(cur);

    const lw = (R/150) * 0.5;
    const els = [`<g clip-path="url(#skyClip)" id="ecliptic">`];
    for (const seg of segments) {
      els.push(`<path d="${smoothPath(seg)}" fill="none"
        stroke="${theme.ecliptic}" stroke-width="${lw}"
        stroke-dasharray="${(R/150)*3} ${(R/150)*2}"/>`);
    }
    els.push(`</g>`);
    return els.join('\n');
  }

  // ── Milky Way ─────────────────────────────────────────────────────
  function renderMilkyWay(state, theme, cx, cy, R, dateObj, lat, lon, isPolar, isSouth) {
    const HALF_WIDTH_DEG = 12;
    // Project spine + upper/lower edges
    const spineProj = [], upperProj = [], lowerProj = [];

    for (const [ra_h, dec] of MILKY_WAY_SPINE) {
      const pt = projectPoint(ra_h * 15, dec, dateObj, lat, lon, cx, cy, R, isPolar, isSouth);
      if (pt) spineProj.push(pt);

      const ptU = projectPoint(ra_h * 15, dec + HALF_WIDTH_DEG, dateObj, lat, lon, cx, cy, R, isPolar, isSouth);
      if (ptU) upperProj.push(ptU);

      const ptL = projectPoint(ra_h * 15, dec - HALF_WIDTH_DEG, dateObj, lat, lon, cx, cy, R, isPolar, isSouth);
      if (ptL) lowerProj.push(ptL);
    }

    if (spineProj.length < 4) return '';

    // Build filled area
    const lowerRev = [...lowerProj].reverse();
    const all = [...upperProj, ...lowerRev];

    const els = [`<g clip-path="url(#skyClip)" id="milkyway">`];
    // Glow band: multiple layers with decreasing opacity
    const lw = (R/150) * (HALF_WIDTH_DEG * 2 / 90 * R * 1.2);
    if (spineProj.length > 3) {
      els.push(`<path d="${smoothPath(spineProj)}"
        fill="none" stroke="${theme.milkyway}" stroke-width="${lw.toFixed(2)}"
        stroke-opacity="0.7" stroke-linecap="round"/>`);
      const lw2 = lw * 1.6;
      els.push(`<path d="${smoothPath(spineProj)}"
        fill="none" stroke="${theme.milkyway}" stroke-width="${lw2.toFixed(2)}"
        stroke-opacity="0.3" stroke-linecap="round"/>`);
    }
    els.push(`</g>`);
    return els.join('\n');
  }

  // ── Cardinal directions ───────────────────────────────────────────
  function renderCardinals(state, theme, fonts, cx, cy, R, isPolar, isSouth) {
    const offs  = R * 0.075;
    const r     = R + offs * 0.5;
    const fs    = R * 0.055;
    const tick  = R * 0.025;
    const lw    = (R/150) * 0.4;

    const cardinals = isPolar
      ? [['N', 0], ['E', 90], ['S', 180], ['W', 270]]
      : [['N', 0], ['E', 90], ['S', 180], ['W', 270]];

    const els = [`<g id="cardinals">`];

    for (const [label, az] of cardinals) {
      const az_rad = az * Math.PI / 180;
      const tx = cx + r * Math.sin(az_rad);
      const ty = cy - r * Math.cos(az_rad);
      const lx1 = cx + (R - tick) * Math.sin(az_rad);
      const ly1 = cy - (R - tick) * Math.cos(az_rad);
      const lx2 = cx + (R + tick) * Math.sin(az_rad);
      const ly2 = cy - (R + tick) * Math.cos(az_rad);

      els.push(`<line x1="${lx1.toFixed(2)}" y1="${ly1.toFixed(2)}"
        x2="${lx2.toFixed(2)}" y2="${ly2.toFixed(2)}"
        stroke="${theme.cardinal}" stroke-width="${lw}"/>`);

      els.push(`<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}"
        font-family="${fonts.title}" font-size="${fs.toFixed(2)}"
        font-weight="${fonts.titleWeight}" fill="${theme.cardinal}"
        text-anchor="middle" dominant-baseline="middle"
        letter-spacing="0.05em">${label}</text>`);
    }

    els.push(`</g>`);
    return els.join('\n');
  }

  // ── Title block ───────────────────────────────────────────────────
  function renderTitle(state, theme, fonts, W, H, margT, margX, titleH, R, cx, cy, dateObj) {
    const els = [`<g id="title-block">`];

    const titleY   = margT + titleH * 0.38;
    const subtitleY = margT + titleH * 0.62;
    const metaY    = margT + titleH * 0.82;

    const titleSize = Math.min(W * 0.065, titleH * 0.4);
    const subSize   = titleSize * 0.45;
    const metaSize  = titleSize * 0.28;

    const title = state.title || 'The Night We Met';
    const subtitle = state.subtitle || '';

    // Decorative rule above title
    const ruleW = W * 0.35;
    const ruleY = margT + titleH * 0.12;
    els.push(`<line x1="${(W/2 - ruleW/2).toFixed(2)}" y1="${ruleY.toFixed(2)}"
      x2="${(W/2 + ruleW/2).toFixed(2)}" y2="${ruleY.toFixed(2)}"
      stroke="${theme.accentColor}" stroke-width="${(W/500*0.3).toFixed(2)}" opacity="0.7"/>`);

    // Title
    els.push(`<text x="${(W/2).toFixed(2)}" y="${titleY.toFixed(2)}"
      font-family="${fonts.title}" font-size="${titleSize.toFixed(2)}"
      font-weight="${fonts.titleWeight}" fill="${theme.titleColor}"
      text-anchor="middle" letter-spacing="0.06em"
      dominant-baseline="auto">${escXML(title)}</text>`);

    // Subtitle
    if (subtitle) {
      els.push(`<text x="${(W/2).toFixed(2)}" y="${subtitleY.toFixed(2)}"
        font-family="${fonts.body}" font-size="${(subSize).toFixed(2)}"
        font-weight="${fonts.bodyWeight}" fill="${theme.subColor}"
        text-anchor="middle" letter-spacing="0.15em" font-style="italic"
        dominant-baseline="auto">${escXML(subtitle)}</text>`);
    }

    // Date / location meta line
    const metaParts = [];
    if (state.showDate && state.date) {
      const dateStr = formatDate(state.date);
      const timeStr = state.timeMode === 'exact' && state.time
        ? ` · ${formatTime(state.time)}` : '';
      metaParts.push(dateStr + timeStr);
    }
    if (state.showCoords) {
      if (state.locationName) {
        metaParts.push(state.locationName);
      } else if (state.lat && state.lon) {
        const la = parseFloat(state.lat);
        const lo = parseFloat(state.lon);
        const latStr = `${Math.abs(la).toFixed(2)}° ${la>=0?'N':'S'}`;
        const lonStr = `${Math.abs(lo).toFixed(2)}° ${lo>=0?'E':'W'}`;
        metaParts.push(`${latStr}, ${lonStr}`);
      }
    }

    if (metaParts.length > 0) {
      els.push(`<text x="${(W/2).toFixed(2)}" y="${metaY.toFixed(2)}"
        font-family="${fonts.body}" font-size="${(metaSize*1.1).toFixed(2)}"
        font-weight="${fonts.bodyWeight}" fill="${theme.textColor}"
        text-anchor="middle" letter-spacing="0.12em"
        dominant-baseline="auto">${escXML(metaParts.join('  ·  '))}</text>`);
    }

    // Decorative rule below title
    const ruleY2 = margT + titleH * 0.95;
    els.push(`<line x1="${(W/2 - ruleW/2).toFixed(2)}" y1="${ruleY2.toFixed(2)}"
      x2="${(W/2 + ruleW/2).toFixed(2)}" y2="${ruleY2.toFixed(2)}"
      stroke="${theme.accentColor}" stroke-width="${(W/500*0.3).toFixed(2)}" opacity="0.7"/>`);

    els.push(`</g>`);
    return els.join('\n');
  }

  // ── DSO footer ────────────────────────────────────────────────────
  function hasDSOFooter(state) {
    return state.showDsoFooter && state.dsos && state.dsos.length > 0;
  }

  function renderDSOFooter(state, theme, fonts, W, margX, footerY) {
    const dsos = state.dsos;
    if (!dsos || dsos.length === 0) return '';

    const els = [`<g id="dso-footer">`];
    const cellW = (W - 2 * margX) / 5;
    const cellH = W * 0.08;
    const thumbS = cellH * 0.55;
    const fs = W * 0.018;
    const fs2 = W * 0.013;

    // Section label
    els.push(`<text x="${W/2}" y="${footerY - cellH*0.05}"
      font-family="${fonts.body}" font-size="${(fs*0.9).toFixed(2)}"
      fill="${theme.textColor}" text-anchor="middle" letter-spacing="0.15em">
      DEEP SKY OBJECTS
    </text>`);

    // Separator line
    const sepW = W * 0.3;
    els.push(`<line x1="${W/2 - sepW/2}" y1="${footerY + cellH*0.05}"
      x2="${W/2 + sepW/2}" y2="${footerY + cellH*0.05}"
      stroke="${theme.accentColor}" stroke-width="0.2" opacity="0.5"/>`);

    for (let i = 0; i < Math.min(5, dsos.length); i++) {
      const dso = dsos[i];
      const cellX = margX + i * cellW;
      const thumbX = cellX + (cellW - thumbS) / 2;
      const thumbY = footerY + cellH * 0.15;
      const nameY  = thumbY + thumbS + fs * 1.2;
      const typeY  = nameY + fs2 * 1.4;

      // Thumbnail placeholder
      if (dso.thumbnailPath) {
        els.push(`<image href="${dso.thumbnailPath}"
          x="${thumbX.toFixed(2)}" y="${thumbY.toFixed(2)}"
          width="${thumbS.toFixed(2)}" height="${thumbS.toFixed(2)}"
          preserveAspectRatio="xMidYMid meet" opacity="0.85"/>`);
      }

      // Visibility badge
      if (dso._visibility) {
        const badgeColor = dso._visibility.ok ? theme.accentColor
          : dso._visibility.low ? '#ffaa00' : '#ff6060';
        const badgeLabel = dso._visibility.twilight ? '⊙' : dso._visibility.ok ? '◉' : '◌';
        els.push(`<text x="${(thumbX + thumbS - 0.5).toFixed(2)}" y="${(thumbY + fs2).toFixed(2)}"
          font-size="${(fs2*1.3).toFixed(2)}" fill="${badgeColor}" text-anchor="end">${badgeLabel}</text>`);
      }

      // Name
      els.push(`<text x="${(cellX + cellW/2).toFixed(2)}" y="${nameY.toFixed(2)}"
        font-family="${fonts.body}" font-size="${fs.toFixed(2)}"
        fill="${theme.subColor}" text-anchor="middle" font-weight="500"
        dominant-baseline="auto">${escXML(dso.name || dso.id)}</text>`);

      // Type
      const typeLabel = formatDSOType(dso.type);
      els.push(`<text x="${(cellX + cellW/2).toFixed(2)}" y="${typeY.toFixed(2)}"
        font-family="${fonts.body}" font-size="${fs2.toFixed(2)}"
        fill="${theme.textColor}" text-anchor="middle" letter-spacing="0.06em"
        dominant-baseline="auto">${typeLabel.toUpperCase()}</text>`);
    }

    els.push(`</g>`);
    return els.join('\n');
  }

  function formatDSOType(t) {
    const map = {
      'galaxy': 'Galaxy', 'nebula': 'Nebula', 'open_cluster': 'Open Cluster',
      'globular_cluster': 'Glob. Cluster', 'planetary_nebula': 'Plan. Nebula',
      'supernova_remnant': 'SNR', 'double_star': 'Double Star', 'asterism': 'Asterism'
    };
    return map[t] || t || 'Object';
  }

  // ── Planet strip ─────────────────────────────────────────────────
  function renderPlanetStrip(state, theme, fonts, W, margX, y, dateObj, lat, lon) {
    const planets = AstroCalc.visiblePlanets(dateObj, lat, lon);
    if (planets.length === 0) {
      return `<text x="${W/2}" y="${y + W*0.02}"
        font-family="${fonts.body}" font-size="${W*0.015}"
        fill="${theme.textColor}" text-anchor="middle" letter-spacing="0.08em">
        NO PLANETS ABOVE HORIZON
      </text>`;
    }

    const moon = AstroCalc.moonPhase(dateObj);
    const moonPos = AstroCalc.moonPosition(dateObj, lat, lon);
    const moonAbove = moonPos && moonPos.alt > 0;

    const els = [`<g id="planet-strip">`];
    const fs = W * 0.018;
    const iconFs = W * 0.025;
    const itemW = (W - 2*margX) / (planets.length + (moonAbove ? 1 : 0) + 1);
    let itemX = margX + itemW * 0.5;

    // Moon
    if (moonAbove) {
      const moonIc = moonAbove ? `${moon.name} ${moon.fraction}%` : '';
      const mc = moonAbove ? theme.subColor : theme.textColor;
      els.push(`<text x="${itemX.toFixed(2)}" y="${(y + W*0.018).toFixed(2)}"
        font-family="${fonts.body}" font-size="${fs.toFixed(2)}"
        fill="${mc}" text-anchor="middle">☽ ${escXML(moonIc)}</text>`);
      itemX += itemW;
    }

    for (const p of planets) {
      const icon = PLANET_ICONS[p.name] || '•';
      els.push(`<text x="${itemX.toFixed(2)}" y="${(y + W*0.018).toFixed(2)}"
        font-family="${fonts.body}" font-size="${fs.toFixed(2)}"
        fill="${theme.subColor}" text-anchor="middle">${icon} ${p.name}</text>`);
      itemX += itemW;
    }

    els.push(`</g>`);
    return els.join('\n');
  }

  // ── Scientific footer ─────────────────────────────────────────────
  function renderSciFooter(state, theme, fonts, W, margX, y, dateObj, lat, lon) {
    const lst   = AstroCalc.lstString(dateObj, parseFloat(lon));
    const moon  = AstroCalc.moonPhase(dateObj);
    const tt    = AstroCalc.twilightTimes(dateObj, lat, lon);

    let ttStr = '';
    if (tt && tt.dusk && tt.dawn) {
      const toLocalTime = (d) => d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12:false });
      ttStr = ` · Astro darkness: ${toLocalTime(tt.dusk)} – ${toLocalTime(tt.dawn)}`;
    }

    const parts = [
      `LST ${lst}`,
      `Moon ${moon.fraction}% (${moon.name})`,
      ttStr
    ].filter(Boolean).join('  ·  ');

    const fs = W * 0.014;
    return `<text x="${W/2}" y="${(y + W*0.016).toFixed(2)}"
      font-family="${fonts.body}" font-size="${fs.toFixed(2)}"
      fill="${theme.textColor}" text-anchor="middle" letter-spacing="0.06em"
      dominant-baseline="auto">${escXML(parts)}</text>`;
  }

  // ── Sky conditions note ───────────────────────────────────────────
  function renderSkyNote(state, theme, fonts, W, margX, y, dateObj, lat, lon) {
    const lp = AstroCalc.lightPollutionHigh(parseFloat(lat), parseFloat(lon));
    const note = lp
      ? 'Location is near a major city — light pollution may reduce visibility.'
      : 'Limiting magnitude ~6.5 under dark skies.';
    const fs = W * 0.013;
    return `<text x="${W/2}" y="${(y + W*0.013).toFixed(2)}"
      font-family="${fonts.body}" font-size="${fs.toFixed(2)}"
      fill="${theme.textColor}" text-anchor="middle" font-style="italic"
      dominant-baseline="auto">${escXML(note)}</text>`;
  }

  // ── XML escape ────────────────────────────────────────────────────
  function escXML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Public API
  return {
    render,
    PRESETS,
    THEMES,
    FONT_PAIRS,
    PAPER_SIZES,
    formatDate,
    formatTime,
    buildDateObject,
    hasDSOFooter
  };

})();
