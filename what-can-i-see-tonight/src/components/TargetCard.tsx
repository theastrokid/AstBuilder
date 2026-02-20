import type { RankedTarget } from '../types';
import { formatTime } from '../lib/astronomy';
import { useApp } from '../context/AppContext';
import WikiImage from './WikiImage';
import MiniAltChart from './MiniAltChart';

interface TargetCardProps {
  ranked: RankedTarget;
  rank: number;
  onClick: () => void;
  view?: 'list' | 'grid';
}

const TYPE_LABELS: Record<string, string> = {
  galaxy: 'Galaxy', nebula: 'Nebula', cluster: 'Cluster',
  globular: 'Globular', planetaryNebula: 'Plan. Neb.',
  doubleCluster: 'Dbl.Cluster', supernovaRemnant: 'SNR',
  asterism: 'Asterism', other: 'Other',
};

const altStyle = (alt: number): React.CSSProperties => ({
  fontWeight: 700,
  color: alt >= 60 ? 'var(--success)' : alt >= 40 ? 'var(--primary)' : 'var(--warning)',
});

// ── GRID card ─────────────────────────────────────────────────────────────────
function GridCard({ ranked, rank, onClick }: TargetCardProps) {
  const { target, maxAltitude, bestTime, score, altSamples } = ranked;
  const { state, dispatch } = useApp();
  const minAltDeg = state.settings.minAltitudeDeg;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        padding: 0,
        width: '100%',
        height: '100%',
        transition: 'border-color 120ms, transform 120ms',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Image strip */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0 }}>
        <WikiImage
          title={target.wikipediaTitle}
          alt={target.name}
          width={200}
          height={120}
          style={{ width: '100%', height: '100%', borderRadius: 0 }}
          onLoad={url => dispatch({ type: 'UPDATE_TARGET_IMAGE', payload: { id: target.id, url } })}
        />
        {/* Rank badge */}
        <div style={{
          position: 'absolute', top: 5, left: 5,
          width: 22, height: 22, borderRadius: '50%',
          background: rank <= 3 ? 'var(--primary)' : 'rgba(0,0,0,0.7)',
          border: rank <= 3 ? 'none' : '1px solid rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 800, color: 'white',
        }}>
          {rank}
        </div>
        {/* Type badge */}
        <div style={{ position: 'absolute', bottom: 5, right: 5 }}>
          <span className={`badge badge-${target.type}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>
            {TYPE_LABELS[target.type] ?? target.type}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '8px 10px 6px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* ID + Name */}
        <div>
          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{target.id}</span>
          {' '}
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{target.name}</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{target.constellation}</div>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
          <span style={{ fontSize: '0.8rem', ...altStyle(maxAltitude) }}>↑ {maxAltitude.toFixed(0)}°</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTime(bestTime)}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>★{target.magnitude}</span>
        </div>

        {/* Mini altitude sparkline */}
        {altSamples.length > 1 && (
          <div style={{ marginTop: '3px' }}>
            <MiniAltChart
              samples={altSamples}
              bestTime={bestTime}
              minAltDeg={minAltDeg}
              height={28}
            />
          </div>
        )}

        {/* Score + Difficulty */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          <span className={`badge badge-${target.difficulty}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
            {target.difficulty}
          </span>
          <span style={{ fontSize: '0.64rem', color: 'var(--text-muted)' }}>
            score {score.toFixed(0)}
          </span>
        </div>
      </div>
    </button>
  );
}

// ── LIST card ─────────────────────────────────────────────────────────────────
function ListCard({ ranked, rank, onClick }: TargetCardProps) {
  const { target, maxAltitude, bestTime, altSamples } = ranked;
  const { state, dispatch } = useApp();
  const minAltDeg = state.settings.minAltitudeDeg;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '10px 12px 8px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: '10px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'border-color 120ms, transform 120ms',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
      }}
    >
      {/* Main row: rank | text | thumbnail */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        {/* Rank badge */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: rank <= 3 ? 'var(--primary)' : 'var(--bg-elevated)',
          border: rank <= 3 ? 'none' : '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.75rem', fontWeight: 800,
          color: rank <= 3 ? 'white' : 'var(--text-muted)',
        }}>
          {rank}
        </div>

        {/* Text block */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{target.id}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.name}</span>
            <span className={`badge badge-${target.type}`}  style={{ fontSize: '0.6rem' }}>{TYPE_LABELS[target.type]}</span>
            <span className={`badge badge-${target.difficulty}`} style={{ fontSize: '0.6rem' }}>{target.difficulty}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '4px', fontSize: '0.78rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>{target.constellation}</span>
            <span style={altStyle(maxAltitude)}>↑ {maxAltitude.toFixed(0)}°</span>
            <span style={{ color: 'var(--text-primary)' }}>⏱ {formatTime(bestTime)}</span>
            <span style={{ color: 'var(--text-muted)' }}>★ {target.magnitude}</span>
            {target.sizeArcMin && <span style={{ color: 'var(--text-muted)' }}>⌀ {target.sizeArcMin}'</span>}
          </div>
        </div>

        {/* Thumbnail */}
        <WikiImage
          title={target.wikipediaTitle}
          alt={target.name}
          width={52}
          height={52}
          onLoad={url => dispatch({ type: 'UPDATE_TARGET_IMAGE', payload: { id: target.id, url } })}
        />
      </div>

      {/* Altitude sparkline strip */}
      {altSamples.length > 1 && (
        <MiniAltChart
          samples={altSamples}
          bestTime={bestTime}
          minAltDeg={minAltDeg}
          height={22}
        />
      )}
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function TargetCard(props: TargetCardProps) {
  return props.view === 'grid'
    ? <GridCard {...props} />
    : <ListCard {...props} />;
}
