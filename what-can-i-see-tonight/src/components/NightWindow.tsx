import type { NightWindow } from '../types';
import { formatTime, getMoonPhaseName, getMoonEmoji } from '../lib/astronomy';

interface NightWindowProps {
  window: NightWindow;
  compact?: boolean;
}

export default function NightWindowDisplay({ window, compact = false }: NightWindowProps) {
  const duration = ((window.end.getTime() - window.start.getTime()) / 3_600_000).toFixed(1);
  const moonName = getMoonPhaseName(window.moonPhase);
  const moonEmoji = getMoonEmoji(window.moonPhase);

  const moonWarning = window.moonIllumination > 50;

  if (compact) {
    return (
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '8px 12px',
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.82rem',
      }}>
        <span title="Night start">
          <span style={{ color: 'var(--text-muted)' }}>Starts </span>
          <strong style={{ color: 'var(--text-primary)' }}>{formatTime(window.start)}</strong>
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span title="Night end">
          <span style={{ color: 'var(--text-muted)' }}>Ends </span>
          <strong style={{ color: 'var(--text-primary)' }}>{formatTime(window.end)}</strong>
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span title="Duration">
          <strong style={{ color: 'var(--primary)' }}>{duration}h</strong>
          <span style={{ color: 'var(--text-muted)' }}> dark</span>
        </span>
        <span style={{ color: 'var(--border)' }}>·</span>
        <span title={`${moonName} - ${window.moonIllumination}% illumination`}
          style={{ color: moonWarning ? 'var(--warning)' : 'var(--text-secondary)' }}>
          {moonEmoji} {window.moonIllumination}%
        </span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '14px',
    }}>
      <Stat label="Darkness Starts" value={formatTime(window.start)} />
      <Stat label="Darkness Ends" value={formatTime(window.end)} />
      <Stat label="Dark Duration" value={`${duration} hours`} accent />
      <Stat
        label={`Moon (${moonName})`}
        value={`${moonEmoji} ${window.moonIllumination}% lit`}
        warn={moonWarning}
      />

      {moonWarning && (
        <div className="info-box warn" style={{ gridColumn: '1/-1' }}>
          Moon is {window.moonIllumination}% illuminated tonight — it may wash out faint targets.
          Stick to bright clusters and double stars for best results.
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent = false, warn = false }: {
  label: string; value: string; accent?: boolean; warn?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '1rem',
        fontWeight: 600,
        color: warn ? 'var(--warning)' : accent ? 'var(--primary)' : 'var(--text-primary)',
      }}>
        {value}
      </div>
    </div>
  );
}
