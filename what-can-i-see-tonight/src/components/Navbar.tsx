import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const TelescopeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const hasResults = state.rankedTargets.length > 0;

  const isHome     = location.pathname === '/';
  const isResults  = location.pathname === '/results';
  const isSettings = location.pathname === '/settings';

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '0 12px',
      height: '52px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
      zIndex: 10,
    }}>
      {/* Logo / back button */}
      {isHome ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: 'auto' }}>
          <StarIcon />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            What Can I See Tonight?
          </span>
        </div>
      ) : (
        <>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: 'auto' }}>
            <StarIcon />
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              {isResults ? 'Tonight\'s Targets' : 'Settings'}
            </span>
          </div>
        </>
      )}

      {/* Nav links */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <NavLink
          to="/"
          className={({ isActive }) =>
            `btn btn-ghost btn-icon${isActive ? ' active' : ''}`
          }
          style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : undefined })}
          title="Home"
        >
          <TelescopeIcon />
        </NavLink>
        {hasResults && (
          <NavLink
            to="/results"
            className={({ isActive }) =>
              `btn btn-ghost btn-icon${isActive ? ' active' : ''}`
            }
            style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : undefined })}
            title="Results"
          >
            <ListIcon />
          </NavLink>
        )}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `btn btn-ghost btn-icon${isActive ? ' active' : ''}`
          }
          style={({ isActive }) => ({ color: isActive ? 'var(--primary)' : undefined })}
          title="Settings"
        >
          <GearIcon />
        </NavLink>
      </div>
    </nav>
  );
}
