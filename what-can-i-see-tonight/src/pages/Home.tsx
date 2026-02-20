import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { createDebouncedGeocoder, reverseGeocode } from '../lib/geocoding';
import { computeNightWindow, rankTargetsForTonight, formatDate } from '../lib/astronomy';
import type { GeocodeSuggestion, Location } from '../types';

const LocationIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// Decorative background stars for the hero
function StarBg() {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.sin(i * 137.5 * (Math.PI / 180)) * 50 + 50,
    y: Math.cos(i * 137.5 * (Math.PI / 180)) * 50 + 50,
    size: (i % 3 === 0) ? 2 : (i % 3 === 1) ? 1.5 : 1,
    opacity: 0.2 + (i % 5) * 0.12,
  }));

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden>
      {stars.map(s => (
        <circle key={s.id} cx={`${s.x}%`} cy={`${s.y}%`} r={s.size} fill="white" opacity={s.opacity} />
      ))}
    </svg>
  );
}

export default function Home() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState(state.location?.cityName ?? '');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(state.location);
  const [geoLoading, setGeoLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const debouncedGeocoder = useRef(createDebouncedGeocoder(500)).current;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedLocation(null);
    setGeoError(null);

    if (!val.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debouncedGeocoder(val, (results, error) => {
      if (error) {
        setGeoError(error);
        setSuggestions([]);
      } else {
        setSuggestions(results);
        setShowDropdown(results.length > 0);
      }
    });
  }, [debouncedGeocoder]);

  const handleSelectSuggestion = (s: GeocodeSuggestion) => {
    const loc: Location = { lat: s.lat, lon: s.lon, cityName: s.displayName.split(',')[0] };
    setSelectedLocation(loc);
    setQuery(loc.cityName);
    setSuggestions([]);
    setShowDropdown(false);
    dispatch({ type: 'SET_LOCATION', payload: loc });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const cityName = await reverseGeocode(lat, lon);
          const loc: Location = { lat, lon, cityName };
          setSelectedLocation(loc);
          setQuery(cityName);
          dispatch({ type: 'SET_LOCATION', payload: loc });
        } catch {
          setGeoError('Could not determine your location name.');
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please enter your city manually.');
        } else {
          setGeoError('Could not get your location. Please enter your city manually.');
        }
      },
      { timeout: 10000 }
    );
  };

  const handleGenerate = async () => {
    const loc = selectedLocation ?? state.location;
    if (!loc) {
      setGeoError('Please select a location first.');
      return;
    }

    setGenerating(true);
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Compute night window
      const nightWindow = computeNightWindow(loc.lat, loc.lon, new Date());
      dispatch({ type: 'SET_NIGHT_WINDOW', payload: nightWindow });

      // Rank targets (in a timeout to not block UI)
      await new Promise(resolve => setTimeout(resolve, 50));
      const ranked = rankTargetsForTonight(
        loc.lat, loc.lon, nightWindow,
        state.settings.minAltitudeDeg,
        state.settings.beginnerMode
      );

      if (!ranked.length) {
        dispatch({ type: 'SET_ERROR', payload: 'No targets found above the altitude limit for this location tonight. Try reducing the minimum altitude in Settings.' });
        setGenerating(false);
        return;
      }

      dispatch({ type: 'SET_RANKED_TARGETS', payload: ranked });
      navigate('/results');
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Calculation failed.' });
    } finally {
      setGenerating(false);
    }
  };

  const canGenerate = !!(selectedLocation ?? state.location) && !generating;
  const tonight = formatDate(new Date());

  return (
    <div className="page">
      {/* Hero section */}
      <div style={{
        position: 'relative',
        background: 'radial-gradient(ellipse at 50% 0%, #0f0f2a 0%, #0a0a0f 70%)',
        padding: '40px 20px 32px',
        textAlign: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <StarBg />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--primary-dim)',
              border: '1px solid rgba(232,114,12,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <StarIcon />
            </div>
          </div>
          <h1 style={{ marginBottom: '6px' }}>
            <span className="gradient-text">What Can I See Tonight?</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>
            Enter your location to get a personalized list of the best deep-sky objects visible from your skies tonight.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '8px' }}>
            {tonight}
          </p>
        </div>
      </div>

      <div className="page-content">
        {/* Location input */}
        <div className="section">
          <div className="section-title">Your Location</div>

          <div ref={searchRef} style={{ position: 'relative', marginBottom: '10px' }}>
            <div className="input-group">
              <input
                className="input"
                type="text"
                placeholder="Search city, town, or address…"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                aria-label="City search"
                aria-autocomplete="list"
              />
              <span className="input-icon"><SearchIcon /></span>
            </div>

            {showDropdown && (
              <div className="autocomplete-dropdown">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="autocomplete-item"
                    role="option"
                    onClick={() => handleSelectSuggestion(s)}
                  >
                    <div style={{ fontWeight: 500, fontSize: '0.88rem' }}>
                      {s.displayName.split(',')[0]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                      {s.displayName.split(',').slice(1, 3).join(',')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn btn-secondary"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            style={{ width: '100%' }}
          >
            {geoLoading ? (
              <><div className="spinner" style={{ width: 16, height: 16 }} /> Detecting location…</>
            ) : (
              <><LocationIcon /> Use my location</>
            )}
          </button>

          {geoError && (
            <div style={{
              marginTop: '8px',
              padding: '10px 12px',
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              color: 'var(--error)',
            }}>
              {geoError}
            </div>
          )}

          {/* Selected location confirmation */}
          {(selectedLocation ?? state.location) && !geoError && (
            <div className="info-box" style={{ marginTop: '10px', fontSize: '0.82rem' }}>
              <strong>Selected:</strong>{' '}
              {(selectedLocation ?? state.location)?.cityName}
              &nbsp;·&nbsp;
              <span style={{ color: 'var(--text-muted)' }}>
                {(selectedLocation ?? state.location)?.lat.toFixed(3)}°,{' '}
                {(selectedLocation ?? state.location)?.lon.toFixed(3)}°
              </span>
            </div>
          )}
        </div>

        {/* Settings summary */}
        <div className="section">
          <div className="section-title">Session Options</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
          }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Min Altitude</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{state.settings.minAltitudeDeg}°</div>
            </div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '10px 12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mode</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: state.settings.beginnerMode ? 'var(--success)' : 'var(--text-primary)' }}>
                {state.settings.beginnerMode ? 'Beginner' : 'All levels'}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Adjust telescope, camera, and session settings in{' '}
            <a href="#/settings" style={{ color: 'var(--primary)' }}>Settings</a>.
          </p>
        </div>

        {/* Error display */}
        {state.error && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            color: 'var(--error)',
            marginBottom: '16px',
          }}>
            {state.error}
          </div>
        )}

        {/* Generate button */}
        <button
          className="btn btn-primary btn-lg"
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{ width: '100%' }}
        >
          {generating ? (
            <><div className="spinner" style={{ width: 18, height: 18, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Computing tonight's sky…</>
          ) : (
            <><StarIcon /> Generate Tonight's Targets</>
          )}
        </button>

        {/* Disclaimer */}
        <div className="info-box warn" style={{ marginTop: '16px' }}>
          <strong>Note:</strong> Results are approximations based on computed sky positions.
          Local terrain, atmosphere, light pollution, and weather are not modeled.
          Best observing times use astronomical twilight (sun below -18°).
        </div>

        {/* Feature highlights */}
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { icon: '🔭', title: '156 Objects', desc: 'Messier + NGC/IC catalog' },
            { icon: '📋', title: 'Sky Report PDF', desc: 'Printable observation list' },
            { icon: '🎯', title: 'FOV Preview', desc: 'With your telescope + camera' },
          ].map((f, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '12px 8px',
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{f.icon}</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{f.title}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
