import { useEffect, useMemo, useState } from 'react';
import type { RankedTarget } from '../types';
import { formatTime, degreesToDMS, getMoonEmoji,
         computeAltitudeSamples, computeMoonAltitudeSamples } from '../lib/astronomy';
import { wikiArticleUrl } from '../lib/wikipedia';
import { useApp } from '../context/AppContext';
import WikiImage from './WikiImage';
import FOVPreview from './FOVPreview';
import AltitudeChart from './AltitudeChart';

interface TargetModalProps {
  ranked: RankedTarget;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  galaxy: 'Galaxy', nebula: 'Emission Nebula', cluster: 'Open Cluster',
  globular: 'Globular Cluster', planetaryNebula: 'Planetary Nebula',
  doubleCluster: 'Double Cluster', supernovaRemnant: 'Supernova Remnant',
  asterism: 'Asterism', other: 'Deep Sky Object',
};

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

type MobilePanel = 'fov' | 'chart' | 'info';

export default function TargetModal({ ranked, onClose }: TargetModalProps) {
  const { target, maxAltitude, bestTime } = ranked;
  const { state } = useApp();
  const { settings } = state;
  const nightWindow = state.nightWindow;
  const location    = state.location;

  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('fov');

  // ── Altitude samples ──────────────────────────────────────────────────────
  const altSamples = useMemo(() => {
    if (!nightWindow || !location) return [];
    return computeAltitudeSamples(
      target.ra, target.dec, location.lat, location.lon,
      nightWindow.start, nightWindow.end, 8
    );
  }, [target.ra, target.dec, location, nightWindow]);

  const moonSamples = useMemo(() => {
    if (!nightWindow || !location) return [];
    return computeMoonAltitudeSamples(
      location.lat, location.lon, nightWindow.start, nightWindow.end, 8
    );
  }, [location, nightWindow]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // ── Left: compact info panel ──────────────────────────────────────────────
  function InfoPanel() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflowY: 'auto' }}>

        {/* Thumbnail + name */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <WikiImage
            title={target.wikipediaTitle} alt={target.name}
            width={72} height={72}
            style={{ borderRadius: 8, flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {target.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {target.constellation}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
              <span className={`badge badge-${target.type}`} style={{ fontSize: '0.6rem' }}>
                {TYPE_LABELS[target.type] ?? target.type}
              </span>
              <span className={`badge badge-${target.difficulty}`} style={{ fontSize: '0.6rem' }}>
                {target.difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* 2×2 quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {[
            { l: 'Peak Alt',  v: `${maxAltitude.toFixed(0)}°`, accent: true },
            { l: 'Best Time', v: formatTime(bestTime) },
            { l: 'Magnitude', v: String(target.magnitude) },
            { l: 'Size',      v: target.sizeArcMin ? `${target.sizeArcMin}'` : 'n/a' },
          ].map(({ l, v, accent }) => (
            <div key={l} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '7px 8px' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: accent ? 'var(--primary)' : 'var(--text-primary)', marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Tonight window */}
        {nightWindow && (
          <div className="info-box" style={{ fontSize: '0.75rem', padding: '7px 10px' }}>
            <strong>Tonight:</strong> {formatTime(nightWindow.start)} – {formatTime(nightWindow.end)}
            &nbsp;·&nbsp; Moon {getMoonEmoji(nightWindow.moonPhase)} {nightWindow.moonIllumination}%
          </div>
        )}

        {/* Coordinates */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {[
            { l: 'RA (J2000)',  v: degreesToDMS(target.ra, true) },
            { l: 'Dec (J2000)', v: degreesToDMS(target.dec) },
          ].map(({ l, v }) => (
            <div key={l} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* How to spot */}
        <div>
          <div className="section-title" style={{ marginBottom: 4, fontSize: '0.65rem' }}>How to Spot</div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {target.howToSpot}
          </p>
        </div>

        {/* Beginner tip */}
        {settings.beginnerMode && (
          <div className="info-box" style={{ fontSize: '0.75rem', padding: '7px 10px' }}>
            <strong>💡</strong>{' '}
            {target.difficulty === 'easy'
              ? 'Great beginner pick — visible in binoculars.'
              : target.difficulty === 'medium'
              ? 'Visible in a small 4–6" scope. Dark skies help.'
              : 'Challenging — needs dark skies and medium aperture.'}
          </div>
        )}

        {/* Wikipedia link */}
        <a
          href={wikiArticleUrl(target.wikipediaTitle)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 'auto', fontSize: '0.78rem' }}
        >
          <ExternalIcon /> Wikipedia
        </a>

        <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
          Coordinates J2000. Altitudes approximate.
        </p>
      </div>
    );
  }

  // ── Centre: FOV preview (main attraction) ─────────────────────────────────
  function FOVPanel() {
    const fRatio = (
      (settings.telescope.focalLength * settings.telescope.reducerFactor) /
      settings.telescope.aperture
    ).toFixed(1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div className="section-title" style={{ margin: 0 }}>Field of View Preview</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {settings.telescope.focalLength}mm f/{fRatio} · {settings.camera.name}
          </div>
        </div>

        {/* FOV fills all remaining height */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <FOVPreview
            telescope={settings.telescope}
            camera={settings.camera}
            target={target}
          />
        </div>
      </div>
    );
  }

  // ── Right: altitude chart ─────────────────────────────────────────────────
  function ChartPanel() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%', overflowY: 'auto' }}>
        <div className="section-title">Altitude Tonight</div>

        {nightWindow ? (
          <>
            <AltitudeChart
              samples={altSamples}
              moonSamples={moonSamples}
              nightWindow={nightWindow}
              minAltDeg={settings.minAltitudeDeg}
              bestTime={bestTime}
              height={200}
            />

            {/* Legend */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {[
                { col: 'var(--success)',        label: '≥60°' },
                { col: 'var(--primary)',         label: '40–60°' },
                { col: 'var(--warning)',         label: '20–40°' },
                { col: 'var(--error)',           label: '<20°' },
                { col: 'rgba(180,180,220,0.5)', label: 'Moon' },
              ].map(({ col, label }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 10, height: 3, background: col, borderRadius: 2, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Best time highlight */}
            <div className="info-box" style={{ fontSize: '0.76rem' }}>
              <strong>Best:</strong> {formatTime(bestTime)} &nbsp;·&nbsp;
              <strong>Max:</strong> {maxAltitude.toFixed(1)}° &nbsp;·&nbsp;
              <strong>Window:</strong> {formatTime(nightWindow.start)}–{formatTime(nightWindow.end)}
            </div>

            {/* Hourly table */}
            {altSamples.length > 0 && (
              <div>
                <div className="section-title" style={{ marginBottom: 5, fontSize: '0.65rem' }}>Hourly</div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                  gap: 3,
                }}>
                  {altSamples
                    .filter((_, i) => i % 4 === 0)
                    .map((s, i) => {
                      const alt = s.altitude;
                      const col = alt >= 60 ? 'var(--success)'
                                : alt >= 40 ? 'var(--primary)'
                                : alt >= 20 ? 'var(--warning)'
                                : 'var(--error)';
                      return (
                        <div key={i} style={{
                          background: 'var(--bg-elevated)', borderRadius: 5,
                          padding: '4px 3px', textAlign: 'center',
                        }}>
                          <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                            {formatTime(s.time)}
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: col }}>
                            {alt < 0 ? '—' : `${alt.toFixed(0)}°`}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            Generate tonight's targets to see the altitude chart.
          </div>
        )}

        <div className="info-box" style={{ fontSize: '0.72rem', marginTop: 'auto' }}>
          Adjust scope/camera in <a href="#/settings" onClick={onClose}>Settings</a> for accurate FOV.
        </div>
      </div>
    );
  }

  const MobileTab = ({ panel, emoji, label }: { panel: MobilePanel; emoji: string; label: string }) => (
    <button
      onClick={() => setMobilePanel(panel)}
      style={{
        flex: 1, padding: '7px 4px',
        fontSize: '0.75rem', fontWeight: 600,
        border: 'none', cursor: 'pointer', background: 'transparent',
        color: mobilePanel === panel ? 'var(--primary)' : 'var(--text-muted)',
        borderBottom: mobilePanel === panel ? '2px solid var(--primary)' : '2px solid transparent',
        marginBottom: -1, transition: 'color 120ms',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
      }}
    >
      <span>{emoji}</span><span className="tab-label">{label}</span>
    </button>
  );

  return (
    <>
      <style>{`
        .tm-grid {
          display: grid;
          /* Info (narrow) | FOV (wide centre) | Chart */
          grid-template-columns: minmax(200px,240px) 1fr minmax(280px,340px);
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .tm-panel {
          overflow-y: auto;
          padding: 14px 16px;
          border-left: 1px solid var(--border-subtle);
        }
        .tm-panel:first-child { border-left: none; }
        .tm-mobile-tabs { display: none; }
        .tm-panel-info  { display: flex; flex-direction: column; }
        .tm-panel-fov   { display: flex; flex-direction: column; }
        .tm-panel-chart { display: flex; flex-direction: column; }
        @media (max-width: 899px) {
          .tm-grid { grid-template-columns: 1fr; }
          .tm-mobile-tabs { display: flex; border-bottom: 1px solid var(--border-subtle); }
          .tm-panel { border-left: none; }
          .tm-panel-info  { display: ${mobilePanel === 'info'  ? 'flex' : 'none'}; flex-direction: column; }
          .tm-panel-fov   { display: ${mobilePanel === 'fov'   ? 'flex' : 'none'}; flex-direction: column; }
          .tm-panel-chart { display: ${mobilePanel === 'chart' ? 'flex' : 'none'}; flex-direction: column; }
        }
        @media (max-width: 480px) { .tab-label { display: none; } }
      `}</style>

      {/* Backdrop */}
      <div
        className="modal-overlay"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        role="dialog" aria-modal aria-label={`Details for ${target.name}`}
        style={{ alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Full-screen shell */}
        <div style={{
          position: 'relative',
          width: '100%', height: '100%',
          maxWidth: 1700, maxHeight: '96vh',
          background: 'var(--bg-card)',
          borderRadius: 14, display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}>

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0, background: 'var(--bg-elevated)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {target.id}
              </span>
              <span className={`badge badge-${target.type}`} style={{ fontSize: '0.6rem' }}>
                {TYPE_LABELS[target.type] ?? target.type}
              </span>
              <span className={`badge badge-${target.difficulty}`} style={{ fontSize: '0.6rem' }}>
                {target.difficulty}
              </span>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: '0.88rem', color: 'var(--text-secondary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
              }}>
                {target.name} · {target.constellation}
              </span>
            </div>

            {/* Stat pills */}
            <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexShrink: 0 }}>
              {[
                { l: 'Peak', v: `${maxAltitude.toFixed(0)}°`, accent: true },
                { l: 'Best', v: formatTime(bestTime) },
                { l: 'Mag',  v: String(target.magnitude) },
              ].map(({ l, v, accent }) => (
                <div key={l} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                  borderRadius: 8, padding: '3px 9px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: '0.54rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: accent ? 'var(--primary)' : 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>

            <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close" style={{ flexShrink: 0 }}>
              <CloseIcon />
            </button>
          </div>

          {/* ── Mobile tab bar ───────────────────────────────────────────────── */}
          <div className="tm-mobile-tabs" style={{ padding: '0 16px', flexShrink: 0 }}>
            <MobileTab panel="fov"   emoji="🔭" label="FOV" />
            <MobileTab panel="chart" emoji="📈" label="Altitude" />
            <MobileTab panel="info"  emoji="📋" label="Info" />
          </div>

          {/* ── 3-panel grid: Info | FOV (centre) | Chart ────────────────────── */}
          <div className="tm-grid">

            {/* LEFT: Info (narrow) */}
            <div className="tm-panel tm-panel-info">
              <InfoPanel />
            </div>

            {/* CENTRE: FOV preview (main, gets all extra space) */}
            <div className="tm-panel tm-panel-fov" style={{ overflow: 'hidden' }}>
              <FOVPanel />
            </div>

            {/* RIGHT: Altitude chart */}
            <div className="tm-panel tm-panel-chart">
              <ChartPanel />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
