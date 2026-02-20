/**
 * Deep-sky poster Canvas renderer.
 *
 * Poster size: 2560 × 3840 px (4K portrait, 2:3 ratio).
 * All measurements are proportional to canvas width via the S scale factor.
 *
 * Layout (top → bottom):
 *  – Starfield background + thin border
 *  – Hero circular image with coloured glow
 *  – Name text (large, thin)
 *  – Coordinate line
 *  – Gold dividers + object title
 *  – 2-column info section
 *  – 4-card secondary object strip
 *  – Footer watermark
 */

import type { PosterData } from '../types';
import type { PosterTheme } from './themes';
import { themeStarColor } from './themes';
import { getPosterTitle } from './objectFinder';
import { raToDisplay, decToDisplay } from './coordsParser';

// ---------------------------------------------------------------------------
// Canvas dimensions (4K portrait)
// ---------------------------------------------------------------------------
export const POSTER_W = 2560;
export const POSTER_H = 3840;

/** Universal scale factor – all measurements are multiples of this. */
const S = POSTER_W / 1024; // 2.5

const BORDER   = Math.round(22 * S);   // 55 px
const HERO_R   = Math.round(312 * S);  // 780 px
const HERO_CX  = POSTER_W / 2;
const HERO_CY  = Math.round(420 * S);  // 1050 px

// ---------------------------------------------------------------------------
// Seeded RNG for consistent starfields
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function loadImg(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => resolve(null), 10_000);
  });
}

function drawCentred(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  tracking: number,
) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalW = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - totalW / 2;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], x, y);
    x += widths[i] + tracking;
  }
}

function clipCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
) {
  const ia = img.naturalWidth / img.naturalHeight;
  const ba = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ia > ba) { sw = sh * ba; sx = (img.naturalWidth - sw) / 2; }
  else          { sh = sw / ba; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ---------------------------------------------------------------------------
// Background + starfield
// ---------------------------------------------------------------------------
function drawBackground(ctx: CanvasRenderingContext2D, theme: PosterTheme, seed: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  grad.addColorStop(0, theme.bg1);
  grad.addColorStop(1, theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Nebula glow behind hero
  const ng = ctx.createRadialGradient(HERO_CX, HERO_CY, 0, HERO_CX, HERO_CY, HERO_R * 2.2);
  ng.addColorStop(0,   theme.nebulaGlow);
  ng.addColorStop(0.5, theme.nebulaGlow.replace(/[\d.]+\)$/, '0.06)'));
  ng.addColorStop(1,   'transparent');
  ctx.fillStyle = ng;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);

  // Stars
  const rng = mulberry32(seed);
  for (let i = 0; i < 360; i++) {
    const x = rng() * POSTER_W;
    const y = rng() * POSTER_H;
    const r = rng() * 1.6 * S + 0.3 * S;
    const a = rng() * 0.7 + 0.15;
    const blue = rng() < 0.3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = blue
      ? themeStarColor(theme.starColor2, a)
      : themeStarColor(theme.starColor1, a);
    ctx.fill();
  }
  // A handful of brighter accent stars
  for (let i = 0; i < 18; i++) {
    const x = rng() * POSTER_W;
    const y = rng() * POSTER_H;
    const r = rng() * 2.8 * S + 1.2 * S;
    const a = rng() * 0.5 + 0.4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = themeStarColor(theme.starColor1, a);
    ctx.fill();
  }
}

// ---------------------------------------------------------------------------
// Border
// ---------------------------------------------------------------------------
function drawBorder(ctx: CanvasRenderingContext2D, theme: PosterTheme) {
  ctx.save();
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = Math.round(1.5 * S);
  const i = BORDER;
  ctx.strokeRect(i, i, POSTER_W - i * 2, POSTER_H - i * 2);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Hero glow
// ---------------------------------------------------------------------------
function drawHeroGlow(ctx: CanvasRenderingContext2D, theme: PosterTheme) {
  const layers = [
    { spread: 100 * S, color: theme.heroGlow1 },
    { spread: 60 * S,  color: theme.heroGlow1.replace(/[\d.]+\)$/, '0.15)') },
    { spread: 30 * S,  color: theme.heroGlow2 },
  ];
  for (const { spread, color } of layers) {
    const g = ctx.createRadialGradient(HERO_CX, HERO_CY, HERO_R - 20 * S, HERO_CX, HERO_CY, HERO_R + spread);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(HERO_CX - HERO_R - spread, HERO_CY - HERO_R - spread, (HERO_R + spread) * 2, (HERO_R + spread) * 2);
  }
}

// ---------------------------------------------------------------------------
// Hero image
// ---------------------------------------------------------------------------
async function drawHeroImage(
  ctx: CanvasRenderingContext2D,
  imgUrl: string | null,
  theme: PosterTheme,
  seed: number,
) {
  const img = await loadImg(imgUrl);

  ctx.save();
  clipCircle(ctx, HERO_CX, HERO_CY, HERO_R);

  if (img) {
    try { drawImageCover(ctx, img, HERO_CX - HERO_R, HERO_CY - HERO_R, HERO_R * 2, HERO_R * 2); }
    catch { drawHeroPlaceholder(ctx, theme, seed); }
  } else {
    drawHeroPlaceholder(ctx, theme, seed);
  }
  ctx.restore();

  // Ring around circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(HERO_CX, HERO_CY, HERO_R, 0, Math.PI * 2);
  ctx.strokeStyle = theme.cardRingColor;
  ctx.lineWidth = Math.round(2 * S);
  ctx.stroke();
  ctx.restore();
}

function drawHeroPlaceholder(
  ctx: CanvasRenderingContext2D, theme: PosterTheme, seed: number,
) {
  const g = ctx.createRadialGradient(HERO_CX, HERO_CY, 0, HERO_CX, HERO_CY, HERO_R);
  g.addColorStop(0,   theme.bg1.replace('#', '') ? adjustColorBrightness(theme.bg1, 2.5) : '#1a1060');
  g.addColorStop(0.6, theme.bg1);
  g.addColorStop(1,   theme.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(HERO_CX - HERO_R, HERO_CY - HERO_R, HERO_R * 2, HERO_R * 2);

  const rng = mulberry32(seed + 9999);
  for (let i = 0; i < 180; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * HERO_R;
    const r = rng() * 1.4 * S + 0.2 * S;
    ctx.beginPath();
    ctx.arc(HERO_CX + Math.cos(angle) * dist, HERO_CY + Math.sin(angle) * dist, r, 0, Math.PI * 2);
    ctx.fillStyle = themeStarColor(theme.starColor1, rng() * 0.6 + 0.2);
    ctx.fill();
  }
}

function adjustColorBrightness(hex: string, factor: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) * factor));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) * factor));
  const b = Math.min(255, Math.round((n & 0xff) * factor));
  return `rgb(${r},${g},${b})`;
}

// ---------------------------------------------------------------------------
// Text sections
// ---------------------------------------------------------------------------
function drawName(ctx: CanvasRenderingContext2D, name1: string, name2: string, theme: PosterTheme) {
  const display = name2 ? `${name1.toUpperCase()} & ${name2.toUpperCase()}` : name1.toUpperCase();
  const maxSz = Math.round(72 * S);
  const rawSz = Math.min(maxSz, Math.max(Math.round(38 * S), Math.floor((1600 * S) / (display.length + 2))));

  ctx.save();
  ctx.font = `200 ${rawSz}px 'Montserrat', 'Helvetica Neue', Arial, sans-serif`;
  ctx.fillStyle = theme.nameColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  drawCentred(ctx, display, HERO_CX, HERO_CY + HERO_R + Math.round(90 * S), rawSz * 0.12);
  ctx.restore();
}

function drawCoords(ctx: CanvasRenderingContext2D, data: PosterData, theme: PosterTheme) {
  const { ra, dec } = data.coords;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const text = `${pad(ra.h)}, ${pad(ra.m)}, ${pad(ra.s)}   ${dec.sign}${pad(dec.d)}, ${pad(dec.m)}, ${pad(dec.s)}`;
  const sz = Math.round(18 * S);

  ctx.save();
  ctx.font = `300 ${sz}px 'Montserrat', Arial, sans-serif`;
  ctx.fillStyle = theme.coordsColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  drawCentred(ctx, text, HERO_CX, HERO_CY + HERO_R + Math.round(140 * S), sz * 0.2);
  ctx.restore();
}

function drawDivider(ctx: CanvasRenderingContext2D, y: number, theme: PosterTheme, width = Math.round(320 * S)) {
  ctx.save();
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = Math.round(1 * S);
  ctx.beginPath();
  ctx.moveTo(HERO_CX - width / 2, y);
  ctx.lineTo(HERO_CX + width / 2, y);
  ctx.stroke();
  ctx.restore();
}

function drawTitle(ctx: CanvasRenderingContext2D, obj: PosterData['mainObject'], theme: PosterTheme) {
  const title = getPosterTitle(obj);
  const y = HERO_CY + HERO_R + Math.round(200 * S);
  const maxSz = Math.round(30 * S);
  const rawSz = Math.min(maxSz, Math.max(Math.round(16 * S), Math.floor((900 * S) / (title.length + 2))));

  ctx.save();
  ctx.font = `600 ${rawSz}px 'Montserrat', Arial, sans-serif`;
  ctx.fillStyle = theme.titleColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  drawCentred(ctx, title, HERO_CX, y, rawSz * 0.14);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Info section
// ---------------------------------------------------------------------------
function drawInfoSection(ctx: CanvasRenderingContext2D, data: PosterData, theme: PosterTheme) {
  const obj = data.mainObject;
  const yStart = HERO_CY + HERO_R + Math.round(252 * S);
  const colPad = Math.round(60 * S);
  const lineH  = Math.round(44 * S);
  const lbSz   = Math.round(10 * S);
  const valSz  = Math.round(18 * S);

  // Full-width separator
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.round(1 * S);
  ctx.beginPath();
  ctx.moveTo(BORDER + Math.round(30 * S), yStart - Math.round(14 * S));
  ctx.lineTo(POSTER_W - BORDER - Math.round(30 * S), yStart - Math.round(14 * S));
  ctx.stroke();
  ctx.restore();

  const col1X = BORDER + colPad;
  const col3X = POSTER_W - BORDER - colPad;
  const col2X = POSTER_W / 2;

  type InfoItem = { label: string; value: string; x: number; align: CanvasTextAlign };

  const items: InfoItem[] = [
    { label: 'KNOWN AS',       value: obj.id,                                    x: col1X, align: 'left' },
    { label: 'MAGNITUDE',      value: obj.magnitude !== null ? obj.magnitude.toFixed(1) : 'N/A', x: col1X, align: 'left' },
    { label: 'TYPE',           value: obj.objectType,                             x: col1X, align: 'left' },
    { label: 'CONSTELLATION',  value: obj.constellation,                          x: col3X, align: 'right' },
    { label: 'RIGHT ASCENSION',value: raToDisplay(obj.raDecimal),                 x: col3X, align: 'right' },
    { label: 'DECLINATION',    value: decToDisplay(obj.decDecimal),               x: col3X, align: 'right' },
  ];

  function drawPair(item: InfoItem, y: number) {
    ctx.save();
    ctx.textAlign = item.align;
    ctx.textBaseline = 'alphabetic';
    ctx.font = `400 ${lbSz}px 'Montserrat', Arial, sans-serif`;
    ctx.fillStyle = theme.labelColor;
    ctx.fillText(item.label, item.x, y);
    ctx.font = `300 ${valSz}px 'Montserrat', Arial, sans-serif`;
    ctx.fillStyle = theme.valueColor;
    ctx.fillText(item.value, item.x, y + Math.round(20 * S));
    ctx.restore();
  }

  items.slice(0, 3).forEach((it, i) => drawPair(it, yStart + i * lineH));
  items.slice(3, 6).forEach((it, i) => drawPair(it, yStart + i * lineH));

  // Centre column – angular distance
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `400 ${lbSz}px 'Montserrat', Arial, sans-serif`;
  ctx.fillStyle = theme.labelColor;
  ctx.fillText('DISTANCE FROM', col2X, yStart + Math.round(12 * S));
  ctx.fillText('NAMED COORD', col2X, yStart + Math.round(28 * S));
  ctx.font = `200 ${Math.round(28 * S)}px 'Montserrat', Arial, sans-serif`;
  ctx.fillStyle = theme.valueColor.replace('0.88)', '0.65)');
  ctx.fillText(`${data.mainDistance.toFixed(2)}°`, col2X, yStart + Math.round(70 * S));
  ctx.restore();

  // Bottom separator
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.round(1 * S);
  ctx.beginPath();
  ctx.moveTo(BORDER + Math.round(30 * S), yStart + 3 * lineH);
  ctx.lineTo(POSTER_W - BORDER - Math.round(30 * S), yStart + 3 * lineH);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Secondary object strip
// ---------------------------------------------------------------------------
async function drawStrip(
  ctx: CanvasRenderingContext2D,
  data: PosterData,
  imageMap: Record<string, string | null>,
  theme: PosterTheme,
) {
  const others = data.otherObjects;
  if (!others.length) return;

  const count = Math.min(4, others.length);
  const stripY = POSTER_H - BORDER - Math.round(290 * S);
  const CARD_R  = Math.round(52 * S);
  const CARD_W  = Math.round(200 * S);
  const totalW  = count * CARD_W;
  const gap = (POSTER_W - BORDER * 2 - Math.round(40 * S) - totalW) / Math.max(count - 1, 1);

  // Section label
  ctx.save();
  ctx.font = `400 ${Math.round(9 * S)}px 'Montserrat', Arial, sans-serif`;
  ctx.fillStyle = theme.labelColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CLOSEST DEEP-SKY OBJECTS BY CLASS', POSTER_W / 2, stripY - Math.round(16 * S));
  ctx.restore();

  // Separator
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.round(1 * S);
  ctx.beginPath();
  ctx.moveTo(BORDER + Math.round(30 * S), stripY - Math.round(6 * S));
  ctx.lineTo(POSTER_W - BORDER - Math.round(30 * S), stripY - Math.round(6 * S));
  ctx.stroke();
  ctx.restore();

  for (let i = 0; i < count; i++) {
    const { object: obj, distance } = others[i];
    const cardCX = BORDER + Math.round(20 * S) + i * (CARD_W + gap) + CARD_W / 2;
    const thumbCY = stripY + CARD_R + Math.round(10 * S);

    // Mini glow
    const mg = ctx.createRadialGradient(cardCX, thumbCY, CARD_R - 10 * S, cardCX, thumbCY, CARD_R + 25 * S);
    mg.addColorStop(0, theme.heroGlow2.replace(/[\d.]+\)$/, '0.18)'));
    mg.addColorStop(1, 'transparent');
    ctx.fillStyle = mg;
    ctx.fillRect(cardCX - CARD_R - 25 * S, thumbCY - CARD_R - 25 * S, (CARD_R + 25 * S) * 2, (CARD_R + 25 * S) * 2);

    const img = await loadImg(imageMap[obj.id] ?? null);
    ctx.save();
    clipCircle(ctx, cardCX, thumbCY, CARD_R);
    if (img) {
      try { drawImageCover(ctx, img, cardCX - CARD_R, thumbCY - CARD_R, CARD_R * 2, CARD_R * 2); }
      catch { drawMiniPlaceholder(ctx, cardCX, thumbCY, CARD_R, theme, i); }
    } else {
      drawMiniPlaceholder(ctx, cardCX, thumbCY, CARD_R, theme, i);
    }
    ctx.restore();

    // Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cardCX, thumbCY, CARD_R, 0, Math.PI * 2);
    ctx.strokeStyle = theme.cardRingColor;
    ctx.lineWidth = Math.round(1.5 * S);
    ctx.stroke();
    ctx.restore();

    const textY = thumbCY + CARD_R + Math.round(18 * S);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const nameDisp = obj.name.length > 18 ? obj.name.slice(0, 16) + '…' : obj.name;
    ctx.font = `400 ${Math.round(13 * S)}px 'Montserrat', Arial, sans-serif`;
    ctx.fillStyle = theme.valueColor;
    ctx.fillText(nameDisp, cardCX, textY);
    ctx.font = `300 ${Math.round(10 * S)}px 'Montserrat', Arial, sans-serif`;
    ctx.fillStyle = theme.labelColor;
    ctx.fillText(obj.normalizedClass.toUpperCase(), cardCX, textY + Math.round(17 * S));
    ctx.font = `300 ${Math.round(11 * S)}px 'Montserrat', Arial, sans-serif`;
    ctx.fillStyle = theme.titleColor;
    ctx.fillText(obj.id, cardCX, textY + Math.round(33 * S));
    ctx.font = `300 ${Math.round(9 * S)}px 'Montserrat', Arial, sans-serif`;
    ctx.fillStyle = theme.footerColor;
    ctx.fillText(`${distance.toFixed(1)}° away`, cardCX, textY + Math.round(50 * S));
    ctx.restore();
  }
}

function drawMiniPlaceholder(
  ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number,
  theme: PosterTheme, idx: number,
) {
  // Slight hue variation per card so they look distinct
  const lightness = [2.0, 1.6, 2.2, 1.4][idx % 4];
  const c1 = adjustColorBrightness(theme.bg1, lightness * 1.8);
  const c2 = adjustColorBrightness(theme.bg1, lightness * 0.8);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
}

// ---------------------------------------------------------------------------
// Master render entry point
// ---------------------------------------------------------------------------
export async function renderPoster(
  canvas: HTMLCanvasElement,
  data: PosterData,
  theme: PosterTheme,
  mainImageUrl: string | null,
  imageMap: Record<string, string | null>,
): Promise<void> {
  canvas.width  = POSTER_W;
  canvas.height = POSTER_H;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const seed = [...(data.name1 + data.name2)].reduce(
    (acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 7919,
  );

  await document.fonts.ready; // ensure Montserrat is loaded

  drawBackground(ctx, theme, seed);
  drawBorder(ctx, theme);
  drawHeroGlow(ctx, theme);
  await drawHeroImage(ctx, mainImageUrl, theme, seed);
  drawName(ctx, data.name1, data.name2, theme);

  const coordY = HERO_CY + HERO_R + Math.round(115 * S);
  drawDivider(ctx, coordY - Math.round(16 * S), theme, Math.round(60 * S));
  drawCoords(ctx, data, theme);
  drawDivider(ctx, coordY + Math.round(32 * S), theme, Math.round(60 * S));

  drawTitle(ctx, data.mainObject, theme);
  drawInfoSection(ctx, data, theme);
  await drawStrip(ctx, data, imageMap, theme);

  // Footer
  ctx.save();
  ctx.font = `300 ${Math.round(9 * S)}px 'Montserrat', Arial, sans-serif`;
  ctx.fillStyle = theme.footerColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(
    'DEEP SKY POSTER GENERATOR  ✦  COORDINATES DERIVED FROM NAME',
    POSTER_W / 2, POSTER_H - BORDER - Math.round(8 * S),
  );
  ctx.restore();
}

export function exportPNG(canvas: HTMLCanvasElement): string | null {
  try { return canvas.toDataURL('image/png'); }
  catch { return null; }
}
