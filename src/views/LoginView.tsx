import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DeviceMobile, CaretDown, Envelope, Lock, SignIn, UserPlus, ShareNetwork, DotsThreeVertical, PlusSquare, CircleNotch } from '@phosphor-icons/react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../supabase/auth';
import { useSettings } from '../contexts/SettingsContext';
import { ICON_SIZE } from '../config/constants';

type Mode = 'signin' | 'signup';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);

function friendlyError(err: unknown, mode: Mode): string {
  if (!(err instanceof Error)) return 'Something went wrong.';
  const msg = err.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password. If you signed up with Google, use "Continue with Google" instead.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (msg.includes('user already registered')) return 'An account with this email already exists. Try signing in, or use "Continue with Google" if that\'s how you registered.';
  if (msg.includes('password')) return 'Password must be at least 6 characters.';
  if (mode === 'signup' && msg.includes('already')) return 'An account with this email already exists. Try signing in instead.';
  return err.message;
}

const fade = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
} as const;

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
};

function PWAAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pwa-accordion">
      <button className="pwa-accordion__toggle" onClick={() => setOpen((o) => !o)}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <DeviceMobile size={ICON_SIZE} weight="fill" />
          Install as app
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{ display: 'flex' }}
        >
          <CaretDown size={ICON_SIZE} weight="fill" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pwa-accordion__body">
              <p style={{ marginBottom: '0.75rem' }}>
                Add TO DO to your home screen — works offline, no app store needed.
              </p>
              {isIOS ? (
                <ol className="install-steps">
                  <li>Open in <strong>Safari</strong></li>
                  <li>Tap the <span className="install-inline-icon"><ShareNetwork size={ICON_SIZE} weight="fill" /></span> <strong>Share</strong> button at the bottom</li>
                  <li>Tap <strong>"Add to Home Screen"</strong></li>
                </ol>
              ) : isAndroid ? (
                <ol className="install-steps">
                  <li>Open in <strong>Chrome</strong></li>
                  <li>Tap <span className="install-inline-icon"><DotsThreeVertical size={ICON_SIZE} weight="fill" /></span> in the top right</li>
                  <li>Tap <strong>"Add to Home Screen"</strong></li>
                </ol>
              ) : (
                <ol className="install-steps">
                  <li>Look for <span className="install-inline-icon"><PlusSquare size={ICON_SIZE} weight="fill" /></span> in your address bar</li>
                  <li>Click it and confirm</li>
                </ol>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LoginView() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [verified, setVerified] = useState(false);
  const { setLocalOnly } = useSettings();
  const navigate = useNavigate();

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading('email');
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else {
        const { needsConfirmation } = await signUpWithEmail(email, password);
        if (needsConfirmation) setVerified(true);
      }
    } catch (err) {
      setError(friendlyError(err, mode));
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading('google');
    try {
      await signInWithGoogle();
    } catch {
      setLoading(null);
    }
  }

  if (verified) {
    return (
      <div className="wizard-screen">
        <motion.div className="wizard-step" variants={stagger} initial="hidden" animate="show">
          <motion.h1 variants={fade} className="wizard-title">Check your email</motion.h1>
          <motion.p variants={fade} className="wizard-body">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and sign in.
          </motion.p>
          <motion.div variants={fade}>
            <button
              className="btn-ghost"
              onClick={() => { setVerified(false); switchMode('signin'); }}
            >
              Back to sign in
            </button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="wizard-screen">
      <motion.div className="wizard-step" variants={stagger} initial="hidden" animate="show">

        {/* Branding */}
        <motion.div variants={fade} style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
          <div className="app-logo__mark" style={{ width: '3.5rem', height: '3.5rem', borderRadius: '1rem', marginBottom: '1rem', marginInline: 'auto' }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <polyline points="3,14 10,21 23,6" stroke="var(--accent)" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.06em', lineHeight: 1 }}>TO DO</div>
          <p style={{ fontSize: '0.85rem', color: 'var(--fg-muted)', marginTop: '0.75rem' }}>A minimal, offline-first task manager.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', marginTop: '0.5rem', opacity: 0.7 }}>Your data lives on this device. Sign in to sync across devices.</p>
          <div style={{ marginTop: '0.875rem', textAlign: 'left' }}><PWAAccordion /></div>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fade} className="auth-tabs" style={{ width: '100%' }}>
          <button className={`auth-tab${mode === 'signin' ? ' auth-tab--active' : ''}`} onClick={() => switchMode('signin')}>
            Sign in
          </button>
          <button className={`auth-tab${mode === 'signup' ? ' auth-tab--active' : ''}`} onClick={() => switchMode('signup')}>
            Sign up
          </button>
        </motion.div>

        {/* Email / password form */}
        <motion.form variants={fade} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <div className="auth-field">
            <Envelope size={ICON_SIZE} weight="fill" className="auth-field__icon" />
            <input
              className="auth-input auth-input--icon"
              type="email"
              placeholder="Email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <Lock size={ICON_SIZE} weight="fill" className="auth-field__icon" />
            <input
              className="auth-input auth-input--icon"
              type="password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={6}
            />
          </div>
          <AnimatePresence>
            {error && (
              <motion.p
                className="auth-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <button className="btn-auth btn-primary auth-submit" type="submit" disabled={loading !== null}>
            {loading === 'email'
              ? <CircleNotch size={32} weight="fill" className="spin" />
              : <>{mode === 'signin' ? <SignIn size={ICON_SIZE} weight="fill" /> : <UserPlus size={ICON_SIZE} weight="fill" />}{mode === 'signin' ? 'Sign in' : 'Create account'}</>
            }
          </button>
        </motion.form>

        {/* Divider + OAuth + local-only grouped tightly */}
        <motion.div variants={fade} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
          <div className="auth-divider"><span>or</span></div>

          <button className="btn-auth btn-google" onClick={handleGoogle} disabled={loading !== null}>
            {loading === 'google'
              ? <CircleNotch size={32} weight="fill" className="spin" />
              : <><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>Continue with Google</>
            }
          </button>

          <button
            className="btn-auth btn-ghost"
            onClick={() => { setLocalOnly(true); navigate('/my-day'); }}
            disabled={loading !== null}
          >
            Use without an account
          </button>
        </motion.div>

      </motion.div>
    </div>
  );
}
