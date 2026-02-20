import { useState } from 'react';
import { useSettings } from '../context/AppContext';
import { TELESCOPE_PRESETS, CAMERA_PRESETS } from '../data/presets';
import FOVPreview, { computeFOV } from '../components/FOVPreview';
import { TARGETS } from '../data/targets';
import EmailSignup from '../components/EmailSignup';

const SaveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

// Sample target for FOV preview
const SAMPLE_TARGET = TARGETS.find(t => t.id === 'M42') ?? TARGETS[0];

export default function Settings() {
  const { settings, updateSettings } = useSettings();
  const [saved, setSaved] = useState(false);

  // Local state for telescope/camera
  const [fl, setFl] = useState(String(settings.telescope.focalLength));
  const [ap, setAp] = useState(String(settings.telescope.aperture));
  const [reducer, setReducer] = useState(String(settings.telescope.reducerFactor));
  const [camW, setCamW] = useState(String(settings.camera.sensorWidth));
  const [camH, setCamH] = useState(String(settings.camera.sensorHeight));
  const [camName, setCamName] = useState(settings.camera.name);

  const currentTelescope = {
    focalLength: parseFloat(fl) || settings.telescope.focalLength,
    aperture: parseFloat(ap) || settings.telescope.aperture,
    reducerFactor: parseFloat(reducer) || 1,
  };

  const currentCamera = {
    name: camName,
    sensorWidth: parseFloat(camW) || settings.camera.sensorWidth,
    sensorHeight: parseFloat(camH) || settings.camera.sensorHeight,
  };

  const fov = computeFOV(currentTelescope, currentCamera);

  const handleTelescopePreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    const preset = TELESCOPE_PRESETS[idx];
    setFl(String(preset.focalLength));
    setAp(String(preset.aperture));
    setReducer(String(preset.reducerFactor));
  };

  const handleCameraPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = parseInt(e.target.value);
    if (isNaN(idx)) return;
    const preset = CAMERA_PRESETS[idx];
    setCamW(String(preset.sensorWidth));
    setCamH(String(preset.sensorHeight));
    setCamName(preset.name);
  };

  const handleSave = () => {
    updateSettings({
      telescope: currentTelescope,
      camera: currentCamera,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page">
      <div className="page-content">
        <h2 style={{ marginBottom: '4px' }}>Settings</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Configure your equipment and session preferences.
        </p>

        {/* ── Observation settings ── */}
        <div className="section">
          <div className="section-title">Observation Settings</div>

          {/* Beginner mode */}
          <div className="toggle-row" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <div>
              <div className="toggle-label">Beginner Mode</div>
              <div className="toggle-desc">Boosts easy objects and adds extra viewing tips</div>
            </div>
            <label className="toggle" aria-label="Toggle beginner mode">
              <input
                type="checkbox"
                checked={settings.beginnerMode}
                onChange={e => updateSettings({ beginnerMode: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Minimum altitude */}
          <div style={{ paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div>
                <div className="toggle-label">Minimum Altitude</div>
                <div className="toggle-desc">Filter out targets below this altitude</div>
              </div>
              <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem', minWidth: '48px', textAlign: 'right' }}>
                {settings.minAltitudeDeg}°
              </span>
            </div>
            <input
              type="range"
              className="range-input"
              min={5}
              max={60}
              step={5}
              value={settings.minAltitudeDeg}
              onChange={e => updateSettings({ minAltitudeDeg: parseInt(e.target.value) })}
              aria-label="Minimum altitude"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>5° (low horizon)</span>
              <span>30° (recommended)</span>
              <span>60° (strict)</span>
            </div>
          </div>
        </div>

        {/* ── Telescope ── */}
        <div className="section">
          <div className="section-title">Telescope</div>

          <div className="form-field" style={{ marginBottom: '10px' }}>
            <label className="form-label">Preset</label>
            <select className="select" onChange={handleTelescopePreset} defaultValue="">
              <option value="" disabled>Select a preset…</option>
              {TELESCOPE_PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div className="form-field">
              <label className="form-label">Focal Length (mm)</label>
              <input
                className="input"
                type="number"
                min={100}
                max={10000}
                value={fl}
                onChange={e => setFl(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Aperture (mm)</label>
              <input
                className="input"
                type="number"
                min={50}
                max={1000}
                value={ap}
                onChange={e => setAp(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Reducer ×</label>
              <input
                className="input"
                type="number"
                min={0.5}
                max={1}
                step={0.01}
                value={reducer}
                onChange={e => setReducer(e.target.value)}
              />
            </div>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Eff. focal length: <strong>{fov.effectiveFocalLength.toFixed(0)} mm</strong>
            &nbsp;·&nbsp;
            f/{(fov.effectiveFocalLength / (parseFloat(ap) || 100)).toFixed(1)}
          </p>
        </div>

        {/* ── Camera ── */}
        <div className="section">
          <div className="section-title">Camera / Sensor</div>

          <div className="form-field" style={{ marginBottom: '10px' }}>
            <label className="form-label">Preset</label>
            <select className="select" onChange={handleCameraPreset} defaultValue="">
              <option value="" disabled>Select a preset…</option>
              {CAMERA_PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.name} ({p.sensorWidth}×{p.sensorHeight}mm)</option>
              ))}
            </select>
          </div>

          <div className="form-field" style={{ marginBottom: '8px' }}>
            <label className="form-label">Sensor Name / Notes</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Canon 6D, ASI2600MC…"
              value={camName}
              onChange={e => setCamName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="form-field">
              <label className="form-label">Sensor Width (mm)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={100}
                step={0.1}
                value={camW}
                onChange={e => setCamW(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Sensor Height (mm)</label>
              <input
                className="input"
                type="number"
                min={1}
                max={100}
                step={0.1}
                value={camH}
                onChange={e => setCamH(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── FOV Live Preview ── */}
        <div className="section">
          <div className="section-title">Live FOV Preview (M42 Orion Nebula)</div>
          <FOVPreview
            telescope={currentTelescope}
            camera={currentCamera}
            target={SAMPLE_TARGET}
            width={320}
            height={220}
          />
        </div>

        {/* ── Report options ── */}
        <div className="section">
          <div className="section-title">Sky Report Options</div>

          <div className="toggle-row">
            <div>
              <div className="toggle-label">Color Report</div>
              <div className="toggle-desc">Dark-themed PDF with color accents</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.reportColor}
                onChange={e => updateSettings({ reportColor: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div className="toggle-label">Compact Layout</div>
              <div className="toggle-desc">Fit all targets on fewer pages (less detail per row)</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.reportCompact}
                onChange={e => updateSettings({ reportCompact: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          <div className="toggle-row">
            <div>
              <div className="toggle-label">Monthly Report Default</div>
              <div className="toggle-desc">Show "Monthly Report" button by default on results page</div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={settings.reportWeekly}
                onChange={e => updateSettings({ reportWeekly: e.target.checked })}
              />
              <span className="toggle-slider" />
            </label>
          </div>

          {/* Report preview summary */}
          <div className="info-box" style={{ marginTop: 8, fontSize: '0.78rem' }}>
            <strong>Tonight's PDF:</strong> 3-column table · {settings.reportCompact ? 'compact (1–2 pages)' : 'full detail'} · {settings.reportColor ? 'colour theme' : 'B&W'}
            <br/>
            <strong>Monthly PDF:</strong> single page · top 12 targets · moon phases, meteor showers &amp; planetary events
          </div>
        </div>

        {/* ── Monthly email signup ── */}
        <div className="section">
          <div className="section-title">Monthly Sky Guide Newsletter</div>
          <EmailSignup />
        </div>

        {/* Save button */}
        <button
          className={`btn ${saved ? 'btn-secondary' : 'btn-primary'}`}
          onClick={handleSave}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          <SaveIcon />
          {saved ? '✓ Settings Saved!' : 'Save Telescope & Camera Settings'}
        </button>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '20px' }}>
          Settings are auto-saved to your browser's local storage.
        </p>
      </div>
    </div>
  );
}
