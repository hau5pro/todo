import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChange } from '../supabase/auth';
import { fetchCloudSettings, pushCloudSettings } from '../db/settings';
export const ACCENT_COLORS = [
    { key: 'blue', label: 'Blue', hex: '#2563eb', darkHex: '#60a5fa' },
    { key: 'purple', label: 'Purple', hex: '#7c3aed', darkHex: '#a78bfa' },
    { key: 'green', label: 'Green', hex: '#16a34a', darkHex: '#4ade80' },
    { key: 'rose', label: 'Rose', hex: '#e11d48', darkHex: '#fb7185' },
    { key: 'orange', label: 'Orange', hex: '#ea580c', darkHex: '#fb923c' },
    { key: 'teal', label: 'Teal', hex: '#0d9488', darkHex: '#2dd4bf' },
];
const STORAGE_KEY = 'todo_settings';
const DEFAULT_ACCENT = 'blue';
const DEFAULTS = {
    accent: DEFAULT_ACCENT,
    theme: 'system',
    hiddenListIds: [],
    setupDone: false,
    showMyDay: true,
    pinnedOrder: [],
    customOrder: [],
    myDayOrder: [],
};
function loadSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const s = { ...DEFAULTS, ...JSON.parse(raw) };
            // Migrate: sync showMyDay into pinnedOrder as a sentinel
            if (s.showMyDay && !s.pinnedOrder.includes('my-day')) {
                s.pinnedOrder = ['my-day', ...s.pinnedOrder];
            }
            else if (!s.showMyDay && s.pinnedOrder.includes('my-day')) {
                s.pinnedOrder = s.pinnedOrder.filter((id) => id !== 'my-day');
            }
            return s;
        }
    }
    catch { }
    // Default: My Day is on, so include sentinel
    return { ...DEFAULTS, pinnedOrder: ['my-day'] };
}
function saveSettings(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}
function drawFavicon(hex, isDark) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const [r, g, b] = hexToRgb(hex);
    // Rounded rect — fills the whole canvas, matches .app-logo__mark aesthetic
    const radius = 14;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.arcTo(size, 0, size, size, radius);
    ctx.arcTo(size, size, 0, size, radius);
    ctx.arcTo(0, size, 0, 0, radius);
    ctx.arcTo(0, 0, size, 0, radius);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${isDark ? 0.28 : 0.18})`;
    ctx.fill();
    // Checkmark — scaled from 15×15 viewBox to fill ~70% of the canvas
    const pad = 14;
    const inner = size - pad * 2; // 36px
    const s = inner / 15;
    const o = pad;
    ctx.strokeStyle = hex;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(2 * s + o, 8 * s + o);
    ctx.lineTo(6 * s + o, 12 * s + o);
    ctx.lineTo(13 * s + o, 4 * s + o);
    ctx.stroke();
    return canvas.toDataURL('image/png');
}
function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function resolveIsDark(theme) {
    if (theme === 'dark')
        return true;
    if (theme === 'light')
        return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'system')
        root.removeAttribute('data-theme');
    else
        root.setAttribute('data-theme', theme);
}
function applyAccentVars(accent, theme) {
    const isDark = resolveIsDark(theme);
    const color = ACCENT_COLORS.find((c) => c.key === accent);
    const hex = isDark ? color.darkHex : color.hex;
    const [r, g, b] = hexToRgb(hex);
    const alpha = isDark ? 0.12 : 0.11;
    const root = document.documentElement;
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, ${alpha})`);
}
function applyFavicon(accent, theme) {
    const isDark = resolveIsDark(theme);
    const color = ACCENT_COLORS.find((c) => c.key === accent);
    const hex = isDark ? color.darkHex : color.hex;
    const favicon = document.getElementById('favicon');
    if (favicon)
        favicon.href = drawFavicon(hex, isDark);
    const themeColor = document.getElementById('theme-color');
    if (themeColor)
        themeColor.content = hex;
}
const SettingsContext = createContext(null);
export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(loadSettings);
    const userRef = useRef(null);
    const debounceRef = useRef(null);
    // Apply theme + accent vars + favicon whenever either changes
    useEffect(() => {
        applyTheme(settings.theme);
        applyAccentVars(settings.accent, settings.theme);
        applyFavicon(settings.accent, settings.theme);
        // Re-apply when system preference changes (only matters in 'system' mode)
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
            applyAccentVars(settings.accent, settings.theme);
            applyFavicon(settings.accent, settings.theme);
        };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [settings.accent, settings.theme]);
    // Sync with cloud on login
    useEffect(() => {
        const unsub = onAuthStateChange(async (user) => {
            userRef.current = user;
            if (user) {
                const cloud = await fetchCloudSettings(user.id).catch(() => null);
                if (cloud) {
                    setSettings((prev) => {
                        const next = { ...prev, ...cloud };
                        saveSettings(next);
                        return next;
                    });
                }
            }
        });
        return unsub;
    }, []);
    function scheduleCloudPush(next) {
        if (!userRef.current)
            return;
        if (debounceRef.current)
            clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            pushCloudSettings(userRef.current.id, next).catch(console.error);
        }, 1000);
    }
    function update(patch) {
        setSettings((prev) => {
            const next = { ...prev, ...patch };
            saveSettings(next);
            scheduleCloudPush(next);
            return next;
        });
    }
    const value = {
        ...settings,
        setAccent: (accent) => update({ accent }),
        setTheme: (theme) => update({ theme }),
        toggleListVisibility: (listId) => {
            setSettings((prev) => {
                const hiddenListIds = prev.hiddenListIds.includes(listId)
                    ? prev.hiddenListIds.filter((id) => id !== listId)
                    : [...prev.hiddenListIds, listId];
                const next = { ...prev, hiddenListIds };
                saveSettings(next);
                scheduleCloudPush(next);
                return next;
            });
        },
        markSetupDone: () => update({ setupDone: true }),
        setShowMyDay: (showMyDay) => {
            setSettings((prev) => {
                const pinnedOrder = showMyDay
                    ? prev.pinnedOrder.includes('my-day') ? prev.pinnedOrder : ['my-day', ...prev.pinnedOrder]
                    : prev.pinnedOrder.filter((id) => id !== 'my-day');
                const next = { ...prev, showMyDay, pinnedOrder };
                saveSettings(next);
                scheduleCloudPush(next);
                return next;
            });
        },
        setPinnedOrder: (pinnedOrder) => update({ pinnedOrder }),
        setCustomOrder: (customOrder) => update({ customOrder }),
        setMyDayOrder: (myDayOrder) => update({ myDayOrder }),
    };
    return _jsx(SettingsContext.Provider, { value: value, children: children });
}
export function useSettings() {
    const ctx = useContext(SettingsContext);
    if (!ctx)
        throw new Error('useSettings must be used within SettingsProvider');
    return ctx;
}
