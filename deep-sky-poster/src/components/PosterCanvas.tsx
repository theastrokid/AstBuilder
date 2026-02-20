import { useState, useRef, useCallback, useEffect } from 'react';
import type { RefObject } from 'react';
import styles from './PosterCanvas.module.css';

interface Props {
  canvasRef: RefObject<HTMLCanvasElement>;
  visible: boolean;
  /** Increment this each time a new poster is generated to re-trigger the reveal. */
  animKey: number;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5.0;

export default function PosterCanvas({ canvasRef, visible, animKey }: Props) {
  const [zoom, setZoom] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimRef = useRef(false); // sync ref so wheel handler can read without stale closure

  // ── Trigger 3D reveal on every new poster ──
  useEffect(() => {
    if (!visible) return;
    setZoom(1);
    setIsAnimating(true);
    isAnimRef.current = true;
    const t = setTimeout(() => {
      setIsAnimating(false);
      isAnimRef.current = false;
    }, 1700);
    return () => clearTimeout(t);
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to zoom (locked during animation) ──
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isAnimRef.current) return;
    e.preventDefault();
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z - e.deltaY * 0.0012)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  if (!visible) return null;

  const pct = Math.round(zoom * 100);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.viewport}>
        {/*
          Two-layer approach:
          • outer (.scaleLayer)  – applies CSS zoom transform after animation
          • inner (.canvasWrap)  – plays the 3-D reveal animation independently
        */}
        <div
          className={styles.scaleLayer}
          style={!isAnimating ? { transform: `scale(${zoom})`, transformOrigin: 'center top' } : undefined}
        >
          <div className={`${styles.canvasWrap} ${isAnimating ? styles.reveal : ''}`}>
            <canvas ref={canvasRef} className={styles.canvas} />
          </div>
        </div>
      </div>

      <p className={styles.hint}>
        {pct !== 100 && <span className={styles.zoomBadge}>{pct}%</span>}
        <span>Scroll to zoom · Full 2560 × 3840 px on download</span>
      </p>
    </div>
  );
}
