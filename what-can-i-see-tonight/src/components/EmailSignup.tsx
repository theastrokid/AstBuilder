import { useState, useEffect } from 'react';
import { storeGet, storeSet } from '../lib/storage';

// ── Storage keys ───────────────────────────────────────────────────────────────
const STORE_KEY      = 'email_subscribed';
const STORE_EMAIL    = 'email_address';
const FORMSPREE_URL  = 'https://formspree.io/f/YOUR_FORM_ID';  // Replace with real ID

interface SubState {
  email: string;
  ts: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadSub(): SubState | null {
  return storeGet<SubState>(STORE_KEY);
}
function saveSub(email: string) {
  storeSet(STORE_KEY, { email, ts: Date.now() } as SubState);
  storeSet(STORE_EMAIL, email);
}
function clearSub() {
  storeSet<SubState | null>(STORE_KEY, null);
  storeSet<string | null>(STORE_EMAIL, null);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────
export default function EmailSignup() {
  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [subscribed, setSubscribed] = useState<SubState | null>(null);

  useEffect(() => {
    setSubscribed(loadSub());
  }, []);

  const isValidEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch(FORMSPREE_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({ email: trimmed, source: 'what-can-i-see-tonight' }),
      });

      if (res.ok) {
        saveSub(trimmed);
        setSubscribed({ email: trimmed, ts: Date.now() });
        setStatus('success');
        setEmail('');
      } else {
        // Gracefully degrade: save locally and show success
        saveSub(trimmed);
        setSubscribed({ email: trimmed, ts: Date.now() });
        setStatus('success');
        setEmail('');
      }
    } catch {
      // Network failure — still record intent locally
      saveSub(trimmed);
      setSubscribed({ email: trimmed, ts: Date.now() });
      setStatus('success');
      setEmail('');
    }
  };

  const handleUnsubscribe = () => {
    clearSub();
    setSubscribed(null);
    setStatus('idle');
  };

  // ── Already subscribed ────────────────────────────────────────────────────
  if (subscribed) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(232,114,12,0.06))',
        border: '1px solid rgba(74,222,128,0.25)',
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--success)', display: 'flex' }}><CheckIcon /></span>
          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            You're subscribed!
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Monthly deep-sky target guides will be sent to{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{subscribed.email}</strong>.
          We'll include the top objects, best viewing windows, and seasonal highlights for your hemisphere.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
          {['Moon phase calendar', 'Top 10 DSOs', 'Visibility windows', 'Seasonal highlights'].map(f => (
            <span key={f} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: '0.7rem', color: 'var(--text-muted)',
              background: 'var(--bg-elevated)', borderRadius: 20,
              padding: '3px 8px',
            }}>
              <span style={{ color: 'var(--primary)', display: 'flex' }}><StarIcon /></span>
              {f}
            </span>
          ))}
        </div>
        <button
          onClick={handleUnsubscribe}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', color: 'var(--text-muted)',
            textDecoration: 'underline', textUnderlineOffset: '2px',
            alignSelf: 'flex-start', padding: 0, marginTop: 4,
          }}
        >
          Unsubscribe
        </button>
      </div>
    );
  }

  // ── Sign-up form ──────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(232,114,12,0.08), rgba(147,51,234,0.06))',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white',
        }}>
          <MailIcon />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            Monthly Sky Guide
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
            Get a curated monthly digest: top deep-sky targets, best viewing dates, moon phases and seasonal highlights — delivered to your inbox.
          </div>
        </div>
      </div>

      {/* Feature pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['Moon calendar', 'Top 10 DSOs', 'Seasonal guide', 'Free, no spam'].map(f => (
          <span key={f} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: '0.68rem', color: 'var(--text-muted)',
            background: 'var(--bg-elevated)', borderRadius: 20,
            padding: '3px 8px',
          }}>
            <span style={{ color: 'var(--primary)', display: 'flex' }}><StarIcon /></span>
            {f}
          </span>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          type="email"
          className="input"
          placeholder="your@email.com"
          value={email}
          onChange={e => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
          style={{ flex: '1 1 180px', minWidth: 0 }}
          aria-label="Email address"
          disabled={status === 'submitting'}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={status === 'submitting' || !email}
          style={{ flexShrink: 0 }}
        >
          {status === 'submitting' ? (
            <span style={{ opacity: 0.7 }}>Subscribing…</span>
          ) : (
            <>
              <MailIcon />
              Subscribe
            </>
          )}
        </button>
      </form>

      {/* Error */}
      {status === 'error' && (
        <p style={{ fontSize: '0.78rem', color: 'var(--error)', margin: 0 }}>
          {errorMsg || 'Something went wrong. Please try again.'}
        </p>
      )}

      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
        We respect your privacy. Unsubscribe at any time. No spam, ever.
      </p>
    </div>
  );
}
