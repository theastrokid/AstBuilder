import { useState, useEffect } from 'react';
import { fetchWikiImage } from '../lib/wikipedia';

interface WikiImageProps {
  title: string;
  alt: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  onLoad?: (url: string | null) => void;
}

const PlaceholderSvg = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ display: 'block' }}
    aria-hidden
  >
    <rect width="100" height="100" fill="#111120" rx="8" />
    <circle cx="50" cy="42" r="18" fill="#1a1a2e" />
    <path d="M 20 78 Q 50 50 80 78" fill="#1a1a2e" />
    <circle cx="50" cy="35" r="6" fill="#252540" />
    <circle cx="72" cy="25" r="3" fill="#e8720c" opacity="0.5" />
    <circle cx="30" cy="22" r="2" fill="#e8720c" opacity="0.4" />
    <circle cx="65" cy="55" r="1.5" fill="#4a90d9" opacity="0.6" />
    <circle cx="28" cy="48" r="2" fill="#4a90d9" opacity="0.4" />
    <circle cx="80" cy="42" r="1" fill="#e8720c" opacity="0.7" />
  </svg>
);

export default function WikiImage({ title, alt, width = 64, height = 64, style, onLoad }: WikiImageProps) {
  const [src, setSrc] = useState<string | null | undefined>(undefined); // undefined = loading
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(undefined);
    setError(false);

    fetchWikiImage(title).then((url) => {
      if (!cancelled) {
        setSrc(url);
        onLoad?.(url);
      }
    }).catch(() => {
      if (!cancelled) {
        setSrc(null);
        setError(true);
      }
    });

    return () => { cancelled = true; };
  }, [title]);

  const containerStyle: React.CSSProperties = {
    width,
    height,
    borderRadius: '8px',
    overflow: 'hidden',
    flexShrink: 0,
    background: 'var(--bg-elevated)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...style,
  };

  if (src === undefined) {
    // Loading state
    return (
      <div className="skeleton" style={{ ...containerStyle }} />
    );
  }

  if (!src || error) {
    return (
      <div style={containerStyle}>
        <PlaceholderSvg size={Math.min(width, height)} />
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <img
        src={src}
        alt={alt}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={() => { setSrc(null); setError(true); }}
      />
    </div>
  );
}
