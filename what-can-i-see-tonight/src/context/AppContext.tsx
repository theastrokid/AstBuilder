import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { AppState, Location, NightWindow, RankedTarget, Settings } from '../types';
import { loadLocation, loadSettings, saveLocation, saveSettings } from '../lib/storage';
import { DEFAULT_TELESCOPE, DEFAULT_CAMERA } from '../data/presets';

// ── Default state ─────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS: Settings = {
  telescope: DEFAULT_TELESCOPE,
  camera: DEFAULT_CAMERA,
  minAltitudeDeg: 25,
  beginnerMode: false,
  reportColor: true,
  reportCompact: false,
  reportWeekly: false,
};

// Merge saved settings with defaults so new fields (e.g. reportWeekly) always exist
const mergedSettings: Settings = { ...DEFAULT_SETTINGS, ...(loadSettings() ?? {}) };

const INITIAL_STATE: AppState = {
  location: loadLocation(),
  nightWindow: null,
  rankedTargets: [],
  settings: mergedSettings,
  loading: false,
  error: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_LOCATION'; payload: Location }
  | { type: 'SET_NIGHT_WINDOW'; payload: NightWindow }
  | { type: 'SET_RANKED_TARGETS'; payload: RankedTarget[] }
  | { type: 'UPDATE_TARGET_IMAGE'; payload: { id: string; url: string | null } }
  | { type: 'SET_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_RESULTS' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOCATION':
      return { ...state, location: action.payload, error: null };
    case 'SET_NIGHT_WINDOW':
      return { ...state, nightWindow: action.payload };
    case 'SET_RANKED_TARGETS':
      return { ...state, rankedTargets: action.payload, loading: false };
    case 'UPDATE_TARGET_IMAGE':
      return {
        ...state,
        rankedTargets: state.rankedTargets.map((rt) =>
          rt.target.id === action.payload.id
            ? { ...rt, wikiImageUrl: action.payload.url ?? undefined }
            : rt
        ),
      };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'RESET_RESULTS':
      return { ...state, rankedTargets: [], nightWindow: null, error: null };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Persist location and settings to localStorage
  useEffect(() => {
    if (state.location) saveLocation(state.location);
  }, [state.location]);

  useEffect(() => {
    saveSettings(state.settings);
  }, [state.settings]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// ── Convenience selectors ─────────────────────────────────────────────────────
export function useSettings() {
  const { state, dispatch } = useApp();
  const updateSettings = (partial: Partial<Settings>) =>
    dispatch({ type: 'SET_SETTINGS', payload: partial });
  return { settings: state.settings, updateSettings };
}
