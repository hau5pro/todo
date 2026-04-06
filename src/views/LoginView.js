import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ChevronDown, Mail, Lock, LogIn, UserPlus, Share, MoreVertical, PlusSquare, Loader2 } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../supabase/auth';
import { ICON_SIZE } from '../config/icons';
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);
function friendlyError(err, mode) {
    if (!(err instanceof Error))
        return 'Something went wrong.';
    const msg = err.message.toLowerCase();
    if (msg.includes('invalid login credentials'))
        return 'Incorrect email or password. If you signed up with Google, use "Continue with Google" instead.';
    if (msg.includes('email not confirmed'))
        return 'Please confirm your email before signing in.';
    if (msg.includes('user already registered'))
        return 'An account with this email already exists. Try signing in, or use "Continue with Google" if that\'s how you registered.';
    if (msg.includes('password'))
        return 'Password must be at least 6 characters.';
    if (mode === 'signup' && msg.includes('already'))
        return 'An account with this email already exists. Try signing in instead.';
    return err.message;
}
const fade = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};
const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
};
function PWAAccordion() {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "pwa-accordion", children: [_jsxs("button", { className: "pwa-accordion__toggle", onClick: () => setOpen((o) => !o), children: [_jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: '0.375rem' }, children: [_jsx(Smartphone, { size: ICON_SIZE, strokeWidth: 1.75 }), "Install as app"] }), _jsx(motion.span, { animate: { rotate: open ? 180 : 0 }, transition: { duration: 0.2, ease: 'easeInOut' }, style: { display: 'flex' }, children: _jsx(ChevronDown, { size: ICON_SIZE, strokeWidth: 2 }) })] }), _jsx(AnimatePresence, { initial: false, children: open && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.25, ease: 'easeInOut' }, style: { overflow: 'hidden' }, children: _jsxs("div", { className: "pwa-accordion__body", children: [_jsx("p", { style: { marginBottom: '0.75rem' }, children: "Add TO DO to your home screen \u2014 works offline, no app store needed." }), isIOS ? (_jsxs("ol", { className: "install-steps", children: [_jsxs("li", { children: ["Open in ", _jsx("strong", { children: "Safari" })] }), _jsxs("li", { children: ["Tap the ", _jsx("span", { className: "install-inline-icon", children: _jsx(Share, { size: ICON_SIZE, strokeWidth: 2 }) }), " ", _jsx("strong", { children: "Share" }), " button at the bottom"] }), _jsxs("li", { children: ["Tap ", _jsx("strong", { children: "\"Add to Home Screen\"" })] })] })) : isAndroid ? (_jsxs("ol", { className: "install-steps", children: [_jsxs("li", { children: ["Open in ", _jsx("strong", { children: "Chrome" })] }), _jsxs("li", { children: ["Tap ", _jsx("span", { className: "install-inline-icon", children: _jsx(MoreVertical, { size: ICON_SIZE, strokeWidth: 2 }) }), " in the top right"] }), _jsxs("li", { children: ["Tap ", _jsx("strong", { children: "\"Add to Home Screen\"" })] })] })) : (_jsxs("ol", { className: "install-steps", children: [_jsxs("li", { children: ["Look for ", _jsx("span", { className: "install-inline-icon", children: _jsx(PlusSquare, { size: ICON_SIZE, strokeWidth: 2 }) }), " in your address bar"] }), _jsx("li", { children: "Click it and confirm" })] }))] }) })) })] }));
}
export function LoginView() {
    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(null);
    const [verified, setVerified] = useState(false);
    function switchMode(next) {
        setMode(next);
        setError(null);
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null);
        setLoading('email');
        try {
            if (mode === 'signin') {
                await signInWithEmail(email, password);
            }
            else {
                const { needsConfirmation } = await signUpWithEmail(email, password);
                if (needsConfirmation)
                    setVerified(true);
            }
        }
        catch (err) {
            setError(friendlyError(err, mode));
        }
        finally {
            setLoading(null);
        }
    }
    async function handleGoogle() {
        setError(null);
        setLoading('google');
        try {
            await signInWithGoogle();
        }
        catch {
            setLoading(null);
        }
    }
    if (verified) {
        return (_jsx("div", { className: "wizard-screen", children: _jsxs(motion.div, { className: "wizard-step", variants: stagger, initial: "hidden", animate: "show", children: [_jsx(motion.h1, { variants: fade, className: "wizard-title", children: "Check your email" }), _jsxs(motion.p, { variants: fade, className: "wizard-body", children: ["We sent a confirmation link to ", _jsx("strong", { children: email }), ". Click it to activate your account, then come back and sign in."] }), _jsx(motion.div, { variants: fade, children: _jsx("button", { className: "btn-ghost", onClick: () => { setVerified(false); switchMode('signin'); }, children: "Back to sign in" }) })] }) }));
    }
    return (_jsx("div", { className: "wizard-screen", children: _jsxs(motion.div, { className: "wizard-step", variants: stagger, initial: "hidden", animate: "show", children: [_jsxs(motion.div, { variants: fade, style: { marginBottom: '3rem', textAlign: 'center' }, children: [_jsx("div", { className: "app-logo__mark", style: { width: '3.5rem', height: '3.5rem', borderRadius: '1rem', marginBottom: '1rem', marginInline: 'auto' }, children: _jsx("svg", { width: "26", height: "26", viewBox: "0 0 26 26", fill: "none", "aria-hidden": "true", children: _jsx("polyline", { points: "3,14 10,21 23,6", stroke: "var(--accent)", strokeWidth: "2.75", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("div", { style: { fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.06em', lineHeight: 1 }, children: "TO DO" }), _jsx("p", { style: { fontSize: '0.85rem', color: 'var(--fg-muted)', marginTop: '0.5rem' }, children: "yet another todo app" }), _jsx("div", { style: { marginTop: '0.875rem', textAlign: 'left' }, children: _jsx(PWAAccordion, {}) })] }), _jsxs(motion.div, { variants: fade, className: "auth-tabs", style: { width: '100%' }, children: [_jsx("button", { className: `auth-tab${mode === 'signin' ? ' auth-tab--active' : ''}`, onClick: () => switchMode('signin'), children: "Sign in" }), _jsx("button", { className: `auth-tab${mode === 'signup' ? ' auth-tab--active' : ''}`, onClick: () => switchMode('signup'), children: "Sign up" })] }), _jsxs(motion.form, { variants: fade, onSubmit: handleSubmit, style: { display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }, children: [_jsxs("div", { className: "auth-field", children: [_jsx(Mail, { size: ICON_SIZE, strokeWidth: 1.75, className: "auth-field__icon" }), _jsx("input", { className: "auth-input auth-input--icon", type: "email", placeholder: "Email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoComplete: "email" })] }), _jsxs("div", { className: "auth-field", children: [_jsx(Lock, { size: ICON_SIZE, strokeWidth: 1.75, className: "auth-field__icon" }), _jsx("input", { className: "auth-input auth-input--icon", type: "password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), required: true, autoComplete: mode === 'signin' ? 'current-password' : 'new-password', minLength: 6 })] }), _jsx(AnimatePresence, { children: error && (_jsx(motion.p, { className: "auth-error", initial: { opacity: 0, y: -6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, transition: { duration: 0.2 }, children: error })) }), _jsx("button", { className: "btn-primary auth-submit", type: "submit", disabled: loading !== null, children: loading === 'email'
                                ? _jsx(Loader2, { size: ICON_SIZE, strokeWidth: 2, className: "spin" })
                                : _jsxs(_Fragment, { children: [mode === 'signin' ? _jsx(LogIn, { size: ICON_SIZE, strokeWidth: 2 }) : _jsx(UserPlus, { size: ICON_SIZE, strokeWidth: 2 }), mode === 'signin' ? 'Sign in' : 'Create account'] }) })] }), _jsx(motion.div, { variants: fade, className: "auth-divider", children: _jsx("span", { children: "or" }) }), _jsx(motion.button, { variants: fade, className: "btn-google", onClick: handleGoogle, disabled: loading !== null, children: loading === 'google'
                        ? _jsx(Loader2, { size: ICON_SIZE, strokeWidth: 2, className: "spin" })
                        : _jsxs(_Fragment, { children: [_jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", "aria-hidden": "true", style: { display: 'block', flexShrink: 0 }, children: [_jsx("path", { fill: "#4285F4", d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" }), _jsx("path", { fill: "#34A853", d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" }), _jsx("path", { fill: "#FBBC05", d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" }), _jsx("path", { fill: "#EA4335", d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" })] }), "Continue with Google"] }) })] }) }));
}
