import { useEffect, useRef } from 'react';
import type { AltSample } from '../types';

interface MiniAltChartProps {
  samples: AltSample[];
  bestTime: Date;
  minAltDeg?: number;
  height?: number;
}

/**
 * Compact altitude sparkline for TargetCard.
 * No axes / labels — just a colour-coded filled curve with a peak marker.
 */
export default function MiniAltChart({
  samples,
  bestTime,
  minAltDeg = 20,
  height = 30,
}: MiniAltChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || samples.length < 2) return;

    // Size the backing store to match CSS pixels × DPR for sharpness
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width  || 200;
    const H = height;
    canvas.width  = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const tStart = samples[0].time.getTime();
    const tEnd   = samples[samples.length - 1].time.getTime();
    const tRange = tEnd - tStart || 1;

    const ALT_MAX = 90;   // chart ceiling
    const ALT_MIN = 0;    // chart floor (negatives clamped)

    const toX = (t: Date) => ((t.getTime() - tStart) / tRange) * W;
    const toY = (alt: number) =>
      H - ((Math.max(ALT_MIN, Math.min(ALT_MAX, alt)) - ALT_MIN) / (ALT_MAX - ALT_MIN)) * H;

    // ── Background ───────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, H);

    // ── Colour-coded fill (vertical gradient keyed to altitude zones) ────────
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const p60 = 1 - 60 / ALT_MAX;   // y-position for 60°
    const p40 = 1 - 40 / ALT_MAX;   // y-position for 40°
    const p20 = 1 - 20 / ALT_MAX;   // y-position for 20°
    grad.addColorStop(0,   'rgba(74,222,128,0.75)');    // ≥ 60° green
    grad.addColorStop(p60, 'rgba(74,222,128,0.70)');
    grad.addColorStop(p60, 'rgba(232,114,12,0.65)');    // 40–60° amber
    grad.addColorStop(p40, 'rgba(232,114,12,0.60)');
    grad.addColorStop(p40, 'rgba(251,191,36,0.55)');    // 20–40° yellow
    grad.addColorStop(p20, 'rgba(251,191,36,0.50)');
    grad.addColorStop(p20, 'rgba(248,113,113,0.45)');   // < 20° red
    grad.addColorStop(1,   'rgba(248,113,113,0.30)');

    // Build the closed fill path
    ctx.beginPath();
    ctx.moveTo(toX(samples[0].time), H);
    ctx.lineTo(toX(samples[0].time), toY(samples[0].altitude));
    for (let i = 1; i < samples.length; i++) {
      ctx.lineTo(toX(samples[i].time), toY(samples[i].altitude));
    }
    ctx.lineTo(toX(samples[samples.length - 1].time), H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Altitude curve line ───────────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(toX(samples[0].time), toY(samples[0].altitude));
    for (let i = 1; i < samples.length; i++) {
      ctx.lineTo(toX(samples[i].time), toY(samples[i].altitude));
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // ── Min-altitude threshold dashed line ───────────────────────────────────
    const threshY = toY(minAltDeg);
    if (threshY > 1 && threshY < H - 1) {
      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, threshY);
      ctx.lineTo(W, threshY);
      ctx.stroke();
      ctx.restore();
    }

    // ── Best-time (peak) vertical marker ─────────────────────────────────────
    const bx = toX(bestTime);
    if (bx >= 0 && bx <= W) {
      // Thin dashed vertical
      ctx.save();
      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = 'rgba(232,114,12,0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, 0);
      ctx.lineTo(bx, H);
      ctx.stroke();
      ctx.restore();

      // Peak dot at the actual peak altitude
      const peakSample = samples.reduce(
        (best, s) => (s.altitude > best.altitude ? s : best),
        samples[0]
      );
      const py = toY(peakSample.altitude);
      ctx.beginPath();
      ctx.arc(bx, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(232,114,12,1)';
      ctx.fill();
    }
  }, [samples, bestTime, minAltDeg, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: `${height}px`,
        borderRadius: '3px',
      }}
    />
  );
}
