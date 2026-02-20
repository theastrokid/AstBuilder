import { useState } from 'react';
import type { ObjectClass } from '../types';
import { THEMES } from '../lib/themes';
import styles from './PosterForm.module.css';

const OBJECT_CLASSES: ObjectClass[] = [
  'Galaxy',
  'Planetary Nebula',
  'Star Cluster',
  'Nebula',
  'Globular Cluster',
];

// Preview swatch colours per theme
const THEME_SWATCHES: Record<string, { bg: string; accent: string; border: string }> = {
  cosmos:       { bg: '#05081C', accent: '#F5C518', border: '#4422AA' },
  aurora:       { bg: '#010d10', accent: '#00FFBB', border: '#00CC90' },
  'nebula-rose':{ bg: '#120416', accent: '#FF7EC0', border: '#CC4490' },
  'solar-flare':{ bg: '#160600', accent: '#FF9020', border: '#CC5500' },
  starlight:    { bg: '#000000', accent: '#FFFFFF', border: '#666666' },
};

interface Props {
  onGenerate: (name1: string, name2: string, primaryType: ObjectClass | null, themeId: string) => void;
  disabled: boolean;
  catalogReady: boolean;
  currentThemeId: string;
  onThemeChange: (id: string) => void;
}

export default function PosterForm({
  onGenerate, disabled, catalogReady, currentThemeId, onThemeChange,
}: Props) {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [primaryType, setPrimaryType] = useState<ObjectClass | ''>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name1.trim() && !name2.trim()) return;
    onGenerate(name1.trim(), name2.trim(), (primaryType as ObjectClass) || null, currentThemeId);
  };

  const combinedLetters = [name1, name2]
    .filter(Boolean)
    .join('')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();

  const canSubmit = catalogReady && !disabled && combinedLetters.length > 0;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* ── Names ── */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>✦ Names</label>
        <p className={styles.hint}>
          Letters are converted into sky coordinates — each name becomes a unique star address.
        </p>

        <div className={styles.nameRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name1">Primary</label>
            <input
              id="name1" className={styles.input} type="text" value={name1}
              onChange={(e) => setName1(e.target.value)}
              placeholder="e.g. EMI" maxLength={40} autoComplete="off" autoFocus
            />
          </div>
          <div className={styles.nameSep}>&</div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="name2">
              Second <span className={styles.optional}>(opt.)</span>
            </label>
            <input
              id="name2" className={styles.input} type="text" value={name2}
              onChange={(e) => setName2(e.target.value)}
              placeholder="e.g. ELI" maxLength={40} autoComplete="off"
            />
          </div>
        </div>

        {combinedLetters.length > 0 && (
          <div className={styles.letterPreview}>
            <span className={styles.letterPreviewLabel}>Combined →</span>
            <span className={styles.letterPreviewValue}>{combinedLetters}</span>
          </div>
        )}
      </div>

      <div className={styles.divider} />

      {/* ── Colour Theme ── */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>◈ Colour Design</label>
        <p className={styles.hint}>Choose a visual style for the print.</p>
        <div className={styles.themeGrid}>
          {THEMES.map((t) => {
            const sw = THEME_SWATCHES[t.id] ?? { bg: '#000', accent: '#fff', border: '#444' };
            const active = currentThemeId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`${styles.themeCard} ${active ? styles.themeCardActive : ''}`}
                onClick={() => onThemeChange(t.id)}
                title={t.name}
              >
                {/* Mini poster swatch */}
                <div
                  className={styles.themeSwatch}
                  style={{ background: sw.bg, borderColor: active ? sw.accent : 'transparent' }}
                >
                  <div className={styles.swatchCircle} style={{ background: sw.border }} />
                  <div className={styles.swatchLine} style={{ background: sw.accent }} />
                  <div className={styles.swatchLine2} style={{ background: `${sw.accent}88` }} />
                </div>
                <span className={styles.themeCardLabel}>{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.divider} />

      {/* ── Object type ── */}
      <div className={styles.section}>
        <label className={styles.sectionLabel}>✦ Object Type</label>
        <p className={styles.hint}>
          Force the main image to a specific class, or leave blank for auto-select.
        </p>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="primaryType">
            Primary type <span className={styles.optional}>(optional)</span>
          </label>
          <select
            id="primaryType" className={styles.select}
            value={primaryType}
            onChange={(e) => setPrimaryType(e.target.value as ObjectClass | '')}
          >
            <option value="">Auto (closest overall)</option>
            {OBJECT_CLASSES.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.divider} />

      <button type="submit" className={styles.generateBtn} disabled={!canSubmit}>
        {disabled ? (
          <><span className={styles.btnSpinner} /> Generating…</>
        ) : (
          'Generate Poster'
        )}
      </button>

      <div className={styles.helpBox}>
        <p className={styles.helpTitle}>How it works</p>
        <ol className={styles.helpList}>
          <li>Letters → numbers (A=01…Z=26) → 12-digit stream</li>
          <li>First 6 → RA (h, m, s) · Next 6 → Dec (°, ′, ″)</li>
          <li>Find closest object per class at those sky coordinates</li>
          <li>Images from Wikipedia (vetted) → Legacy Survey → Aladin DSS2</li>
          <li>Render 2560 × 3840 px (4K) poster · download as PNG</li>
        </ol>
      </div>
    </form>
  );
}
