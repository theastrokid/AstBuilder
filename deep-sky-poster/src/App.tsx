import { useState, useEffect, useRef, useCallback } from 'react';
import type { DeepSkyObject, ObjectClass, PosterData } from './types';
import { loadCatalog } from './lib/catalogParser';
import { nameToCoords } from './lib/nameToCoords';
import { buildPosterData } from './lib/objectFinder';
import { initImageCache, resolveImage, resolveImages } from './lib/imageResolver';
import { renderPoster, exportPNG } from './lib/posterRenderer';
import { getTheme, THEMES } from './lib/themes';
import PosterForm from './components/PosterForm';
import PosterCanvas from './components/PosterCanvas';
import ObjectList from './components/ObjectList';
import styles from './App.module.css';

type AppStatus =
  | 'idle'
  | 'loading-catalog'
  | 'catalog-ready'
  | 'generating'
  | 'rendering'
  | 'done'
  | 'error';

export default function App() {
  const [status, setStatus] = useState<AppStatus>('loading-catalog');
  const [catalog, setCatalog] = useState<DeepSkyObject[]>([]);
  const [error, setError] = useState<string>('');
  const [posterData, setPosterData] = useState<PosterData | null>(null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [imageMap, setImageMap] = useState<Record<string, string | null>>({});
  const [imgProgress, setImgProgress] = useState<{ done: number; total: number } | null>(null);
  const [showObjectList, setShowObjectList] = useState(false);
  const [themeId, setThemeId] = useState('cosmos');
  const [posterGenCount, setPosterGenCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ── Load catalog + image cache ──
  useEffect(() => {
    (async () => {
      try {
        await initImageCache();
        const objects = await loadCatalog('./data/master_catalog.csv');
        if (!objects.length) throw new Error('Catalog appears empty — check /public/data/master_catalog.csv');
        setCatalog(objects);
        setStatus('catalog-ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    })();
  }, []);

  const handleGenerate = useCallback(
    async (name1: string, name2: string, primaryType: ObjectClass | null, selectedThemeId: string) => {
      if (!catalog.length) return;
      setError('');
      setShowObjectList(false);
      setPosterData(null);
      setImgProgress(null);
      setThemeId(selectedThemeId);

      try {
        setStatus('generating');

        const combinedInput = [name1, name2].filter(Boolean).join('');
        const coords = nameToCoords(combinedInput);
        const data = buildPosterData(catalog, coords, name1, name2, primaryType);
        setPosterData(data);

        setStatus('rendering');

        // Resolve main image first (shows the poster quickly)
        const mainUrl = await resolveImage(data.mainObject);
        setMainImageUrl(mainUrl);

        // Kick off an initial render with whatever we have + trigger 3-D reveal
        const theme = getTheme(selectedThemeId);
        setPosterGenCount((n) => n + 1);
        if (canvasRef.current) {
          await renderPoster(canvasRef.current, data, theme, mainUrl, {});
        }

        // Resolve secondary images with progress
        const secondaryObjects = data.otherObjects.map((o) => o.object);
        setImgProgress({ done: 0, total: secondaryObjects.length });
        const imgResults = await resolveImages(secondaryObjects, (done, total) => {
          setImgProgress({ done, total });
        });
        setImageMap(imgResults);
        setImgProgress(null);

        // Final full render with all images
        if (canvasRef.current) {
          await renderPoster(canvasRef.current, data, theme, mainUrl, imgResults);
        }

        setStatus('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [catalog],
  );

  // Re-render on theme change if poster is already shown
  const handleThemeChange = useCallback(
    async (newThemeId: string) => {
      setThemeId(newThemeId);
      if (status === 'done' && canvasRef.current && posterData) {
        const theme = getTheme(newThemeId);
        await renderPoster(canvasRef.current, posterData, theme, mainImageUrl, imageMap).catch(() => {});
      }
    },
    [status, posterData, mainImageUrl, imageMap],
  );

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const url = exportPNG(canvasRef.current);
    if (!url) {
      alert(
        'Download blocked: a cross-origin image tainted the canvas.\n' +
        'The poster will re-render with placeholder sky images — please try again.',
      );
      return;
    }
    const a = document.createElement('a');
    a.href = url;
    const nameSlug = posterData
      ? [posterData.name1, posterData.name2].filter(Boolean).join('-').toUpperCase()
      : 'deep-sky-poster';
    a.download = `${nameSlug}-${themeId}.png`;
    a.click();
  }, [posterData, themeId]);

  const isLoading = status === 'generating' || status === 'rendering';
  const showPreview = status === 'rendering' || status === 'done';
  const currentTheme = THEMES.find((t) => t.id === themeId) ?? THEMES[0];

  return (
    <div className={styles.root}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.logo}>✦</span>
          <div>
            <h1 className={styles.title}>Deep Sky Poster</h1>
            <p className={styles.subtitle}>Your name written in the stars</p>
          </div>
          {/* Live theme chip */}
          {status === 'done' && (
            <div className={styles.themeChip} style={{ borderColor: currentTheme.accentColor.replace('rgba', 'rgba').slice(0, -2) + '66)' }}>
              <span style={{ color: currentTheme.titleColor }}>{currentTheme.label}</span>
            </div>
          )}
        </div>
      </header>

      <main className={styles.main}>
        {/* Left: form */}
        <section className={styles.formCol}>
          <PosterForm
            onGenerate={handleGenerate}
            disabled={isLoading}
            catalogReady={status !== ('loading-catalog' as AppStatus) && status !== 'error'}
            currentThemeId={themeId}
            onThemeChange={handleThemeChange}
          />

          {/* Status messages */}
          {status === 'loading-catalog' && (
            <p className={styles.statusMsg}><span className={styles.spinner} /> Loading catalog…</p>
          )}
          {status === 'generating' && (
            <p className={styles.statusMsg}><span className={styles.spinner} /> Computing coordinates &amp; finding objects…</p>
          )}
          {status === 'rendering' && (
            <p className={styles.statusMsg}>
              <span className={styles.spinner} /> Fetching astronomy images…
              {imgProgress && ` (${imgProgress.done}/${imgProgress.total})`}
            </p>
          )}
          {error && (
            <div className={styles.errorBox}><strong>Error:</strong> {error}</div>
          )}

          {/* Actions */}
          {status === 'done' && (
            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={handleDownload}>
                ↓ Download 4K PNG
              </button>
              <button className={styles.btnSecondary} onClick={() => setShowObjectList((v) => !v)}>
                {showObjectList ? 'Hide' : 'Show'} object details
              </button>
            </div>
          )}

          {showObjectList && posterData && (
            <ObjectList
              mainObject={posterData.mainObject}
              mainDistance={posterData.mainDistance}
              others={posterData.otherObjects}
            />
          )}
        </section>

        {/* Right: canvas preview */}
        <section className={styles.previewCol}>
          <PosterCanvas canvasRef={canvasRef} visible={showPreview} animKey={posterGenCount} />
          {!showPreview && (
            <div className={styles.placeholder}>
              <span className={styles.placeholderIcon}>✦</span>
              <p>{status === 'loading-catalog' ? 'Loading catalog…' : 'Enter a name and click Generate'}</p>
              <p className={styles.placeholderSub}>
                {catalog.length > 0 ? `${catalog.length} objects loaded` : ''}
              </p>
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Coordinates derived algorithmically from your name ·
          Images: Wikipedia (astronomy-vetted) → Legacy Survey → Aladin DSS2 ·
          Catalog: {catalog.length} deep-sky objects
        </p>
      </footer>
    </div>
  );
}
