import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatDate } from '../lib/astronomy';
import { generateSkyReport, generateMonthlyReport } from '../lib/pdfReport';
import TargetCard from '../components/TargetCard';
import TargetModal from '../components/TargetModal';
import NightWindowDisplay from '../components/NightWindow';
import type { RankedTarget } from '../types';

// ── Icons ────────────────────────────────────────────────────────────────────
const PdfIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
);
const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
);
const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
);
const ListIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
);

type FilterType = 'all' | 'galaxy' | 'nebula' | 'cluster' | 'globular' | 'planetaryNebula' | 'other';
type SortKey   = 'score' | 'altitude' | 'magnitude' | 'bestTime' | 'size';
type ViewMode  = 'list' | 'grid';

const FILTER_OPTS: Array<{ value: FilterType; label: string }> = [
  { value: 'all',            label: 'All' },
  { value: 'galaxy',         label: 'Galaxies' },
  { value: 'cluster',        label: 'Clusters' },
  { value: 'globular',       label: 'Globulars' },
  { value: 'nebula',         label: 'Nebulae' },
  { value: 'planetaryNebula',label: 'Plan. Neb.' },
  { value: 'other',          label: 'Other' },
];

const SORT_OPTS: Array<{ value: SortKey; label: string }> = [
  { value: 'score',     label: 'Best Score' },
  { value: 'altitude',  label: 'Altitude' },
  { value: 'magnitude', label: 'Brightness' },
  { value: 'bestTime',  label: 'Best Time' },
  { value: 'size',      label: 'Ang. Size' },
];

export default function Results() {
  const { state } = useApp();
  const navigate  = useNavigate();

  const [selectedTarget, setSelectedTarget] = useState<RankedTarget | null>(null);
  const [filter,    setFilter]    = useState<FilterType>('all');
  const [sortKey,   setSortKey]   = useState<SortKey>('score');
  const [view,      setView]      = useState<ViewMode>('grid');
  const [pdfBusy,   setPdfBusy]   = useState(false);
  const [weekBusy,  setWeekBusy]  = useState(false);
  const [pdfError,  setPdfError]  = useState<string | null>(null);
  const [gridCols,  setGridCols]  = useState(() => window.innerWidth >= 768 ? 5 : 3);

  useEffect(() => {
    const update = () => setGridCols(window.innerWidth >= 768 ? 5 : 3);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { rankedTargets, nightWindow, location, settings } = state;

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!location || !nightWindow || !rankedTargets.length) {
    return (
      <div className="page">
        <div className="page-content" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, paddingTop:60 }}>
          <div style={{ fontSize:'3rem' }}>🔭</div>
          <h2>No Results Yet</h2>
          <p style={{ color:'var(--text-secondary)', textAlign:'center' }}>
            Go back and generate tonight's targets for your location.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go to Home</button>
        </div>
      </div>
    );
  }

  // ── Filtered + sorted targets ──────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = rankedTargets.filter(rt => {
      if (filter === 'all') return true;
      if (filter === 'other') return !['galaxy','nebula','cluster','globular','planetaryNebula'].includes(rt.target.type);
      return rt.target.type === filter;
    });

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'altitude':  return b.maxAltitude - a.maxAltitude;
        case 'magnitude': return a.target.magnitude - b.target.magnitude;
        case 'bestTime':  return a.bestTime.getTime() - b.bestTime.getTime();
        case 'size':      return (b.target.sizeArcMin ?? 0) - (a.target.sizeArcMin ?? 0);
        default:          return b.score - a.score;
      }
    });
    return list;
  }, [rankedTargets, filter, sortKey]);

  const handleNightPdf = async () => {
    setPdfBusy(true); setPdfError(null);
    try {
      await generateSkyReport({ location, nightWindow, targets: rankedTargets, settings });
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'PDF error');
    } finally { setPdfBusy(false); }
  };

  const handleMonthlyPdf = async () => {
    setWeekBusy(true); setPdfError(null);
    try {
      await generateMonthlyReport({ location, settings });
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : 'Monthly PDF error');
    } finally { setWeekBusy(false); }
  };

  return (
    <div className="page">
      <div className="page-content" style={{ paddingTop: 10, maxWidth: 'none', padding: '10px clamp(12px, 3vw, 48px) 16px' }}>

        {/* ── Header strip ───────────────────────────────────────────────── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:'0.95rem' }}>{location.cityName}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
              {formatDate(nightWindow.start)} · {rankedTargets.length} targets
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            <RefreshIcon /> Recalculate
          </button>
        </div>

        {/* ── Night window (compact) ──────────────────────────────────────── */}
        <NightWindowDisplay window={nightWindow} compact />

        {/* ── PDF buttons row ─────────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
          <button className="btn btn-primary btn-sm" onClick={handleNightPdf} disabled={pdfBusy} style={{ justifyContent:'center' }}>
            {pdfBusy
              ? <><div className="spinner" style={{ width:13, height:13, borderColor:'rgba(255,255,255,0.3)', borderTopColor:'white' }} /> Building…</>
              : <><PdfIcon /> Tonight's Report</>}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleMonthlyPdf} disabled={weekBusy} style={{ justifyContent:'center' }}>
            {weekBusy
              ? <><div className="spinner" style={{ width:13, height:13 }} /> Building…</>
              : <><CalendarIcon /> Monthly Report</>}
          </button>
        </div>
        {pdfError && (
          <div style={{ marginTop:6, padding:'8px 10px', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)', borderRadius:'var(--radius-md)', fontSize:'0.78rem', color:'var(--error)' }}>
            {pdfError}
          </div>
        )}

        {/* ── Beginner banner ─────────────────────────────────────────────── */}
        {settings.beginnerMode && (
          <div className="info-box" style={{ marginTop:8, fontSize:'0.78rem' }}>
            <strong>Beginner Mode</strong> — easy objects ranked higher, tips shown in detail view.
          </div>
        )}

        {/* ── Controls bar ────────────────────────────────────────────────── */}
        <div style={{ display:'flex', gap:6, marginTop:10, alignItems:'center', flexWrap:'wrap' }}>
          {/* Type filter chips */}
          <div style={{ display:'flex', gap:4, overflowX:'auto', flex:1, paddingBottom:2 }}>
            {FILTER_OPTS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                style={{
                  padding:'4px 10px', borderRadius:20, fontSize:'0.72rem', fontWeight:600,
                  cursor:'pointer', border:'1px solid',
                  whiteSpace:'nowrap',
                  background: filter === opt.value ? 'var(--primary)' : 'var(--bg-elevated)',
                  borderColor: filter === opt.value ? 'var(--primary)' : 'var(--border)',
                  color: filter === opt.value ? 'white' : 'var(--text-secondary)',
                  transition:'all 120ms',
                }}
              >{opt.label}</button>
            ))}
          </div>

          {/* Sort */}
          <select
            className="select"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            style={{ width:'auto', fontSize:'0.75rem', padding:'4px 28px 4px 8px', flexShrink:0 }}
          >
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* View toggle */}
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', overflow:'hidden', flexShrink:0 }}>
            {(['list','grid'] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding:'5px 8px', border:'none', cursor:'pointer',
                  background: view === v ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: view === v ? 'white' : 'var(--text-muted)',
                  display:'flex', alignItems:'center',
                }}
                title={`${v} view`}
              >
                {v === 'list' ? <ListIcon /> : <GridIcon />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Count line ──────────────────────────────────────────────────── */}
        <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', margin:'6px 0 8px', textAlign:'right' }}>
          {displayed.length} / {rankedTargets.length} objects
        </div>

        {/* ── Target grid / list ──────────────────────────────────────────── */}
        {displayed.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px', color:'var(--text-muted)' }}>
            No {filter} objects visible tonight.
          </div>
        ) : view === 'grid' ? (
          <div
            style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 8 }}
          >
            {displayed.map(rt => (
              <TargetCard
                key={rt.target.id}
                ranked={rt}
                rank={rankedTargets.indexOf(rt) + 1}
                onClick={() => setSelectedTarget(rt)}
                view="grid"
              />
            ))}
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {displayed.map(rt => (
              <TargetCard
                key={rt.target.id}
                ranked={rt}
                rank={rankedTargets.indexOf(rt) + 1}
                onClick={() => setSelectedTarget(rt)}
                view="list"
              />
            ))}
          </div>
        )}

        {/* ── Footer disclaimer ───────────────────────────────────────────── */}
        <p style={{ fontSize:'0.68rem', color:'var(--text-muted)', textAlign:'center', margin:'16px 0 20px', fontStyle:'italic' }}>
          Altitudes are approximate (J2000, no proper motion). Local obstructions and light pollution not modelled.
        </p>
      </div>

      {selectedTarget && (
        <TargetModal ranked={selectedTarget} onClose={() => setSelectedTarget(null)} />
      )}
    </div>
  );
}
