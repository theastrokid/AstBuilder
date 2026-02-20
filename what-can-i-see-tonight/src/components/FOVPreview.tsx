import { useEffect, useRef, useState, useCallback } from 'react';
import type { TelescopeConfig, CameraConfig, DeepSkyTarget } from '../types';

interface FOVPreviewProps {
  telescope: TelescopeConfig;
  camera:    CameraConfig;
  target:    DeepSkyTarget;
  maxHeight?: number;
  /** Legacy — ignored */
  width?: number;
  height?: number;
}

interface FOVInfo {
  fovWidthDeg:         number;
  fovHeightDeg:        number;
  fovWidthArcMin:      number;
  fovHeightArcMin:     number;
  effectiveFocalLength: number;
}

export function computeFOV(telescope: TelescopeConfig, camera: CameraConfig): FOVInfo {
  const fl   = telescope.focalLength * telescope.reducerFactor;
  const fovW = (57.2958 * camera.sensorWidth)  / fl;
  const fovH = (57.2958 * camera.sensorHeight) / fl;
  return {
    fovWidthDeg:          fovW,
    fovHeightDeg:         fovH,
    fovWidthArcMin:       fovW * 60,
    fovHeightArcMin:      fovH * 60,
    effectiveFocalLength: fl,
  };
}

// ── Module-level blob URL cache (keyed by ra_dec_fovDeg — zoom-independent) ──
const hipsCache = new Map<string, string | null>();

function buildCacheKey(raDeg: number, dec: number, fovDeg: number): string {
  return `${raDeg.toFixed(2)}_${dec.toFixed(2)}_${fovDeg.toFixed(4)}`;
}

/**
 * Fetch one DSS2 colour image at the FULL sensor FOV (always zoom=1).
 * All zoom levels are then handled with instant client-side canvas cropping.
 */
async function fetchHipsImage(
  raDeg:       number,
  dec:         number,
  fovDeg:      number,
  aspectRatio: number,
  signal:      AbortSignal
): Promise<string | null> {
  const reqW = 1200;
  const reqH = Math.max(60, Math.round(reqW * aspectRatio));

  const params = new URLSearchParams({
    hips:       'CDS/P/DSS2/color',
    width:      String(reqW),
    height:     String(reqH),
    fov:        String(fovDeg),
    projection: 'TAN',
    coordsys:   'icrs',
    ra:         String(raDeg),
    dec:        String(dec),
    format:     'jpg',
  });

  try {
    const res = await fetch(
      `https://alasky.u-strasbg.fr/hips-image-services/hips2fits?${params}`,
      { signal }
    );
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ── Synthetic starfield fallback ──────────────────────────────────────────────
function generateStars(seed: number, count: number, w: number, h: number) {
  const stars: { x: number; y: number; r: number; b: number }[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = 0; i < count; i++)
    stars.push({ x: rand() * w, y: rand() * h, r: rand() * 1.6 + 0.2, b: rand() * 0.8 + 0.2 });
  return stars;
}

function drawSynthetic(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) / 1.4);
  g.addColorStop(0, '#0e0e22'); g.addColorStop(1, '#04040a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const { x, y, r, b } of generateStars(42, 160, W, H)) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210,215,255,${b})`; ctx.fill();
  }
}

// ── Canvas overlay ────────────────────────────────────────────────────────────
function drawOverlay(
  ctx:  CanvasRenderingContext2D,
  W:    number,
  H:    number,
  fov:  FOVInfo,
  target: DeepSkyTarget,
  zoom: number
) {
  const cx = W / 2, cy = H / 2;
  const pxPerArcMinX = zoom * W / fov.fovWidthArcMin;
  const pxPerArcMinY = zoom * H / fov.fovHeightArcMin;

  // ── Sensor frame ───────────────────────────────────────────────────────
  const fw = zoom * W, fh = zoom * H;
  const fx = (W - fw) / 2, fy = (H - fh) / 2;
  const pad = 3, tick = zoom <= 1 ? 14 : 20;

  if (zoom <= 1) {
    ctx.save();
    ctx.setLineDash([8, 4]);
    ctx.strokeStyle = 'rgba(232,114,12,0.9)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(fx + pad, fy + pad, fw - pad * 2, fh - pad * 2);
    ctx.restore();
  }

  // Corner ticks (inside canvas for zoom ≤ 1, at canvas edge for zoom > 1)
  ctx.strokeStyle = 'rgba(232,114,12,1)';
  ctx.lineWidth = 2.5;
  const corners: [number, number, number, number][] = zoom <= 1
    ? [[fx + pad, fy + pad, 1, 1], [fx + fw - pad, fy + pad, -1, 1],
       [fx + pad, fy + fh - pad, 1, -1], [fx + fw - pad, fy + fh - pad, -1, -1]]
    : [[pad, pad, 1, 1], [W - pad, pad, -1, 1],
       [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1]];

  for (const [ex, ey, sx, sy] of corners) {
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + sx * tick, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex, ey + sy * tick); ctx.stroke();
  }

  // ── Object angular size ────────────────────────────────────────────────
  if (target.sizeArcMin) {
    const rx = Math.max((target.sizeArcMin / 2) * pxPerArcMinX, 5);
    const ry = Math.max((target.sizeArcMin / 2) * pxPerArcMinY, 5);
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    glow.addColorStop(0, 'rgba(100,180,255,0.18)');
    glow.addColorStop(1, 'rgba(100,180,255,0)');
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100,180,255,0.85)'; ctx.lineWidth = 1.5; ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100,180,255,0.9)'; ctx.fill();
  }

  // ── Crosshair ──────────────────────────────────────────────────────────
  const ch = 18;
  ctx.strokeStyle = 'rgba(100,180,255,0.45)'; ctx.lineWidth = 0.85;
  ctx.beginPath(); ctx.moveTo(cx - ch, cy); ctx.lineTo(cx + ch, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - ch); ctx.lineTo(cx, cy + ch); ctx.stroke();

  // ── FOV label ─────────────────────────────────────────────────────────
  const fovLabel = zoom === 1
    ? `${fov.fovWidthArcMin.toFixed(0)}' × ${fov.fovHeightArcMin.toFixed(0)}'`
    : `${(fov.fovWidthArcMin / zoom).toFixed(1)}' × ${(fov.fovHeightArcMin / zoom).toFixed(1)}'  (${zoom.toFixed(1)}×)`;

  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lw = ctx.measureText(fovLabel).width + 14;
  const lx = cx - lw / 2, ly = 9, lh = 17;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  roundRect(ctx, lx, ly, lw, lh, 4); ctx.fill();
  ctx.fillStyle = 'rgba(232,114,12,1)';
  ctx.fillText(fovLabel, cx, ly + lh / 2);

  // ── Object name label ──────────────────────────────────────────────────
  const objHalfPx = target.sizeArcMin ? Math.max((target.sizeArcMin / 2) * pxPerArcMinY, 5) : 5;
  const nameTxt = target.id;
  const nameY = Math.min(cy + objHalfPx + 16, H - 12);
  const nw2 = ctx.measureText(nameTxt).width + 12;
  const nx = cx - nw2 / 2, ny = nameY - 8, nh = 15;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, nx, ny, nw2, nh, 3); ctx.fill();
  ctx.font = 'bold 11px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(nameTxt, cx, ny + nh / 2);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

// ── Zoom config ───────────────────────────────────────────────────────────────
// Only zoom-IN steps: image is cropped client-side → instant, no network request
const ZOOM_STEPS = [1, 1.5, 2, 3, 4, 6, 8, 12];

// ── Main component ────────────────────────────────────────────────────────────
type LoadStatus = 'loading' | 'real' | 'error';

export default function FOVPreview({ telescope, camera, target, maxHeight }: FOVPreviewProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Base image: fetched ONCE per target/scope change, reused for all zoom levels
  const baseImgRef   = useRef<HTMLImageElement | null>(null);
  const abortRef     = useRef<AbortController | null>(null);

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [zoom,   setZoom]   = useState(1);

  const fov = computeFOV(telescope, camera);

  const INTRINSIC_W = 1200;
  const INTRINSIC_H = Math.max(60, Math.round(INTRINSIC_W * fov.fovHeightDeg / Math.max(fov.fovWidthDeg, 0.001)));

  // ── Zoom controls ─────────────────────────────────────────────────────
  const zoomIn = useCallback(() => {
    setZoom(z => ZOOM_STEPS.find(s => s > z + 0.01) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  }, []);
  const zoomOut = useCallback(() => {
    setZoom(z => [...ZOOM_STEPS].reverse().find(s => s < z - 0.01) ?? ZOOM_STEPS[0]);
  }, []);
  const zoomReset = useCallback(() => setZoom(1), []);

  // ── Wheel zoom ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn(); else zoomOut();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomIn, zoomOut]);

  // ── Fetch base image (zoom=1 FOV) — NEVER re-fetches on zoom ─────────
  useEffect(() => {
    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // Reset state for the new target/scope
    baseImgRef.current = null;
    setStatus('loading');
    setZoom(1); // Reset zoom when target/scope changes

    const raDeg = target.ra * 15;
    const key   = buildCacheKey(raDeg, target.dec, fov.fovWidthDeg);

    function loadBlob(url: string) {
      const img = new Image();
      img.onload = () => {
        if (ac.signal.aborted) return;
        baseImgRef.current = img;
        setStatus('real');
      };
      img.onerror = () => {
        if (ac.signal.aborted) return;
        setStatus('error');
      };
      img.src = url;
    }

    if (hipsCache.has(key)) {
      const cached = hipsCache.get(key);
      if (cached) loadBlob(cached);
      else setStatus('error');
      return () => ac.abort();
    }

    fetchHipsImage(raDeg, target.dec, fov.fovWidthDeg, INTRINSIC_H / INTRINSIC_W, ac.signal)
      .then(url => {
        if (ac.signal.aborted) return;
        hipsCache.set(key, url);
        if (url) loadBlob(url);
        else setStatus('error');
      });

    return () => ac.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.ra, target.dec, fov.fovWidthDeg, fov.fovHeightDeg]);

  // ── Draw effect — instant client-side crop for zoom, no network ───────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = INTRINSIC_W;
    const H = INTRINSIC_H;

    ctx.clearRect(0, 0, W, H);

    const img = baseImgRef.current;

    if (!img || status === 'loading') {
      // Show starfield while fetching
      drawSynthetic(ctx, W, H);
      return;
    }

    if (status === 'error') {
      drawSynthetic(ctx, W, H);
      drawOverlay(ctx, W, H, fov, target, zoom);
      return;
    }

    // ── Instant canvas crop-scale — no network request ────────────────
    // At zoom Z, show the centre 1/Z of the base image (both axes)
    const iW = img.naturalWidth  || W;
    const iH = img.naturalHeight || H;
    const cropW = iW / zoom;
    const cropH = iH / zoom;
    const cropX = (iW - cropW) / 2;
    const cropY = (iH - cropH) / 2;

    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, W, H);
    drawOverlay(ctx, W, H, fov, target, zoom);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, zoom, INTRINSIC_W, INTRINSIC_H]);

  const fovDisplay = fov;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 8 }}>
      {/* Canvas + controls */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          userSelect: 'none',
          cursor: 'crosshair',
          flex: 1,
          minHeight: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          width={INTRINSIC_W}
          height={INTRINSIC_H}
          style={{
            display: 'block',
            width: '100%',
            height: maxHeight ? undefined : '100%',
            maxHeight: maxHeight ? `${maxHeight}px` : undefined,
            objectFit: 'contain',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: '#04040a',
          }}
        />

        {/* Loading overlay */}
        {status === 'loading' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'rgba(4,4,10,0.55)', borderRadius: 10,
            fontSize: '0.8rem', color: 'var(--text-muted)',
          }}>
            <div className="spinner" style={{
              width: 14, height: 14,
              borderColor: 'rgba(255,255,255,0.15)', borderTopColor: 'var(--primary)',
            }} />
            Loading sky image…
          </div>
        )}

        {/* Zoom controls */}
        <div style={{
          position: 'absolute', bottom: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <ZoomBtn onClick={zoomOut}  label="−" title="Zoom out (scroll ↓)" disabled={zoom <= ZOOM_STEPS[0]} />
          <span style={{
            minWidth: 42, textAlign: 'center',
            fontSize: '0.75rem', fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            background: 'rgba(0,0,0,0.65)', borderRadius: 4,
            padding: '2px 6px',
          }}>
            {zoom === 1 ? '1×' : zoom % 1 === 0 ? `${zoom}×` : `${zoom.toFixed(1)}×`}
          </span>
          <ZoomBtn onClick={zoomIn}   label="+" title="Zoom in (scroll ↑)"  disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} />
          {zoom !== 1 && <ZoomBtn onClick={zoomReset} label="⌂" title="Reset zoom (1×)" />}
        </div>

        {/* Source badge */}
        {status !== 'loading' && (
          <div style={{
            position: 'absolute', bottom: 10, left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.68)', borderRadius: 4,
            padding: '2px 8px', fontSize: '0.63rem',
            color: status === 'real' ? 'rgba(100,210,120,0.9)' : 'rgba(180,180,180,0.7)',
            whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>
            {status === 'real'
              ? '🛰 DSS2 Color · CDS/Aladin'
              : '✦ Simulated (sky image unavailable)'}
          </div>
        )}

        {/* Zoom hint */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)',
          background: 'rgba(0,0,0,0.45)', borderRadius: 3, padding: '1px 5px',
          pointerEvents: 'none',
        }}>
          scroll to zoom
        </div>

        {/* Instant zoom badge — shows while zoomed (no loading delay) */}
        {zoom > 1 && status === 'real' && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(232,114,12,0.85)', borderRadius: 4,
            padding: '2px 7px', fontSize: '0.65rem', fontWeight: 700,
            color: 'white', pointerEvents: 'none',
          }}>
            ⚡ instant
          </div>
        )}
      </div>

      {/* FOV stat pills */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, flexShrink: 0 }}>
        <FOVStat label="FOV Width"  value={`${fovDisplay.fovWidthArcMin.toFixed(1)}'`}  sub={`${fovDisplay.fovWidthDeg.toFixed(2)}°`} />
        <FOVStat label="FOV Height" value={`${fovDisplay.fovHeightArcMin.toFixed(1)}'`} sub={`${fovDisplay.fovHeightDeg.toFixed(2)}°`} />
        <FOVStat label="Eff. FL"    value={`${fovDisplay.effectiveFocalLength.toFixed(0)}mm`} />
      </div>
    </div>
  );
}

function ZoomBtn({
  onClick, label, title, disabled,
}: { onClick: () => void; label: string; title: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 26, height: 26, borderRadius: 4,
        background: disabled ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)',
        border: '1px solid rgba(255,255,255,0.2)',
        color: disabled ? 'rgba(255,255,255,0.25)' : 'white',
        fontSize: '1rem', fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

function FOVStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginTop: 2 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}
