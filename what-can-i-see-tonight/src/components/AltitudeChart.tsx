import { useEffect, useRef, useMemo } from 'react';
import type { AltSample, NightWindow } from '../types';
import { formatTime } from '../lib/astronomy';

interface AltitudeChartProps {
  samples: AltSample[];
  moonSamples?: AltSample[];
  nightWindow: NightWindow;
  minAltDeg?: number;
  bestTime?: Date;
  width?: number;
  height?: number;
  compact?: boolean;
}

const PAD = { top: 10, right: 10, bottom: 28, left: 32 };

function altColor(alt: number): [number, number, number] {
  if (alt >= 60) return [74, 222, 128];   // green
  if (alt >= 40) return [232, 114, 12];   // amber
  if (alt >= 20) return [251, 191, 36];   // yellow
  return [248, 113, 113];                  // red
}

export default function AltitudeChart({
  samples,
  moonSamples,
  nightWindow,
  minAltDeg = 25,
  bestTime,
  width = 400,
  height = 140,
  compact = false,
}: AltitudeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const PAD_TOP    = compact ? 6  : PAD.top;
  const PAD_BOTTOM = compact ? 22 : PAD.bottom;
  const PAD_LEFT   = compact ? 28 : PAD.left;
  const PAD_RIGHT  = compact ? 6  : PAD.right;

  // Pre-compute chart extents from samples
  const { tStart, tEnd, maxAlt } = useMemo(() => {
    const tS = nightWindow.start.getTime();
    const tE = nightWindow.end.getTime();
    const mA = Math.max(90, ...samples.map(s => s.altitude));
    return { tStart: tS, tEnd: tE, maxAlt: mA };
  }, [samples, nightWindow]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !samples.length) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const W = width;
    const H = height;
    const cW = W - PAD_LEFT - PAD_RIGHT;
    const cH = H - PAD_TOP  - PAD_BOTTOM;

    // Background
    ctx.fillStyle = '#06060f';
    ctx.fillRect(0, 0, W, H);

    // Grid lines + Y-axis labels
    ctx.textAlign = 'right';
    ctx.font = `${compact ? 8 : 9}px sans-serif`;
    ctx.fillStyle = 'rgba(144,144,176,0.7)';

    const yTicks = [0, 15, 30, 45, 60, 75, 90];
    for (const tick of yTicks) {
      const y = PAD_TOP + cH - (tick / 90) * cH;
      // Grid line
      ctx.strokeStyle = tick === 0 ? 'rgba(144,144,176,0.3)' : 'rgba(144,144,176,0.1)';
      ctx.lineWidth = tick === minAltDeg ? 0 : 0.6;
      ctx.beginPath();
      ctx.moveTo(PAD_LEFT, y);
      ctx.lineTo(PAD_LEFT + cW, y);
      ctx.stroke();
      // Label
      if (!compact || tick % 30 === 0) {
        ctx.fillStyle = 'rgba(144,144,176,0.7)';
        ctx.fillText(`${tick}°`, PAD_LEFT - 3, y + 3);
      }
    }

    // Min altitude threshold line
    const minY = PAD_TOP + cH - (minAltDeg / 90) * cH;
    ctx.strokeStyle = 'rgba(251,191,36,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PAD_LEFT, minY);
    ctx.lineTo(PAD_LEFT + cW, minY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!compact) {
      ctx.font = '8px sans-serif';
      ctx.fillStyle = 'rgba(251,191,36,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(`min ${minAltDeg}°`, PAD_LEFT + 4, minY - 3);
    }

    // X-axis time labels
    const tRange = tEnd - tStart;
    const hourMs = 3_600_000;
    ctx.textAlign = 'center';
    ctx.font = `${compact ? 8 : 9}px sans-serif`;
    ctx.fillStyle = 'rgba(144,144,176,0.7)';

    // Find first whole hour after tStart
    const firstHour = Math.ceil(tStart / hourMs) * hourMs;
    for (let t = firstHour; t <= tEnd; t += hourMs) {
      const x = PAD_LEFT + ((t - tStart) / tRange) * cW;
      // Tick mark
      ctx.strokeStyle = 'rgba(144,144,176,0.2)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, PAD_TOP + cH);
      ctx.stroke();
      // Label
      const label = formatTime(new Date(t));
      ctx.fillText(label, x, H - PAD_BOTTOM + 12);
    }

    // ── Moon altitude (faint grey) ──────────────────────────────────────────
    if (moonSamples && moonSamples.length > 1) {
      ctx.strokeStyle = 'rgba(180,180,220,0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      let first = true;
      for (const s of moonSamples) {
        const x = PAD_LEFT + ((s.time.getTime() - tStart) / tRange) * cW;
        const y = PAD_TOP  + cH - Math.max(0, Math.min(90, s.altitude)) / 90 * cH;
        if (first) { ctx.moveTo(x, y); first = false; }
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ── Target altitude filled area ────────────────────────────────────────
    // Draw coloured segments between samples
    for (let i = 1; i < samples.length; i++) {
      const prev = samples[i - 1];
      const curr = samples[i];
      const x0 = PAD_LEFT + ((prev.time.getTime() - tStart) / tRange) * cW;
      const x1 = PAD_LEFT + ((curr.time.getTime() - tStart) / tRange) * cW;
      const y0 = PAD_TOP  + cH - Math.max(0, Math.min(90, prev.altitude)) / 90 * cH;
      const y1 = PAD_TOP  + cH - Math.max(0, Math.min(90, curr.altitude)) / 90 * cH;
      const yBase = PAD_TOP + cH;
      const midAlt = (prev.altitude + curr.altitude) / 2;

      // Fill under curve
      const [r, g, b] = altColor(midAlt);
      ctx.beginPath();
      ctx.moveTo(x0, yBase);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x1, yBase);
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
      ctx.fill();
    }

    // Altitude curve stroke
    ctx.beginPath();
    ctx.lineWidth = 2;
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const x = PAD_LEFT + ((s.time.getTime() - tStart) / tRange) * cW;
      const y = PAD_TOP  + cH - Math.max(0, Math.min(90, s.altitude)) / 90 * cH;
      const [r, g, b] = altColor(s.altitude);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Finish previous segment
        ctx.strokeStyle = (() => {
          const [pr, pg, pb] = altColor(samples[i - 1].altitude);
          return `rgba(${pr},${pg},${pb},0.9)`;
        })();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
    ctx.strokeStyle = `rgba(74,222,128,0.9)`;
    ctx.stroke();

    // ── Best-time vertical marker ──────────────────────────────────────────
    if (bestTime) {
      const bx = PAD_LEFT + ((bestTime.getTime() - tStart) / tRange) * cW;
      ctx.strokeStyle = 'rgba(232,114,12,0.9)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.moveTo(bx, PAD_TOP);
      ctx.lineTo(bx, PAD_TOP + cH);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label above
      if (!compact) {
        ctx.font = 'bold 8px sans-serif';
        ctx.fillStyle = 'rgba(232,114,12,0.9)';
        ctx.textAlign = 'center';
        ctx.fillText('PEAK', bx, PAD_TOP + 8);
      }
    }

    // ── Now marker ────────────────────────────────────────────────────────
    const now = Date.now();
    if (now > tStart && now < tEnd) {
      const nx = PAD_LEFT + ((now - tStart) / tRange) * cW;
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(nx, PAD_TOP);
      ctx.lineTo(nx, PAD_TOP + cH);
      ctx.stroke();
      ctx.setLineDash([]);
      if (!compact) {
        ctx.font = '8px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText('NOW', nx, PAD_TOP + 8);
      }
    }

    // Border
    ctx.strokeStyle = 'rgba(37,37,64,0.8)';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD_LEFT, PAD_TOP, cW, cH);

  }, [samples, moonSamples, nightWindow, minAltDeg, bestTime, width, height, compact,
      PAD_TOP, PAD_BOTTOM, PAD_LEFT, PAD_RIGHT, tStart, tEnd]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: compact ? `${height}px` : undefined,
        borderRadius: '6px',
        border: '1px solid var(--border-subtle)',
      }}
      aria-label="Altitude chart"
    />
  );
}
