import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { onAuthStateChange } from '../supabase/auth';
import { fetchCloudSettings, pushCloudSettings } from '../db/settings';
import type { SoundStyle } from '../utils/sound';

export type AccentColor = 'blue' | 'sky' | 'indigo' | 'purple' | 'fuchsia' | 'pink' | 'rose' | 'orange' | 'teal' | 'emerald' | 'yellow' | 'slate';
export type Theme = 'system' | 'light' | 'dark';

export const ACCENT_COLORS: { key: AccentColor; label: string; hex: string; darkHex: string }[] = [
  { key: 'blue',    label: 'Blue',    hex: '#2563eb', darkHex: '#60a5fa' },
  { key: 'sky',     label: 'Sky',     hex: '#0284c7', darkHex: '#38bdf8' },
  { key: 'indigo',  label: 'Indigo',  hex: '#4f46e5', darkHex: '#818cf8' },
  { key: 'purple',  label: 'Purple',  hex: '#7c3aed', darkHex: '#c084fc' },
  { key: 'fuchsia', label: 'Fuchsia', hex: '#a21caf', darkHex: '#e879f9' },
  { key: 'pink',    label: 'Pink',    hex: '#db2777', darkHex: '#f472b6' },
  { key: 'rose',    label: 'Rose',    hex: '#e11d48', darkHex: '#fb7185' },
  { key: 'orange',  label: 'Orange',  hex: '#ea580c', darkHex: '#fb923c' },
  { key: 'teal',    label: 'Teal',    hex: '#0d9488', darkHex: '#2dd4bf' },
  { key: 'emerald', label: 'Emerald', hex: '#059669', darkHex: '#34d399' },
  { key: 'yellow',  label: 'Yellow',  hex: '#ca8a04', darkHex: '#facc15' },
  { key: 'slate',   label: 'Slate',   hex: '#475569', darkHex: '#94a3b8' },
];

export interface Settings {
  accent: AccentColor;
  theme: Theme;
  hiddenListIds: string[];
  setupDone: boolean;
  showMyDay: boolean;
  pinnedOrder: string[];
  customOrder: string[];
  myDayOrder: string[];
  listOrders: Record<string, string[]>;
  soundEnabled: boolean;
  soundStyle: SoundStyle;
  hapticEnabled: boolean;
  sidebarCollapsed: boolean;
  listsOpen: boolean;
  folderCollapsed: Record<string, boolean>;
  folderOrders: Record<string, string[]>;
  listGroupOrders: Record<string, string[]>;  // ordered group names per list id
  syncEnabled: boolean;
  localOnly: boolean;
}

interface SettingsContextValue extends Settings {
  setAccent: (color: AccentColor) => void;
  setTheme: (t: Theme) => void;
  toggleListVisibility: (listId: string) => void;
  markSetupDone: () => void;
  setPinnedOrder: (ids: string[]) => void;
  setCustomOrder: (ids: string[]) => void;
  setMyDayOrder: (ids: string[]) => void;
  setListOrder: (listId: string, ids: string[]) => void;
  setSoundEnabled: (v: boolean) => void;
  setSoundStyle: (s: SoundStyle) => void;
  setHapticEnabled: (v: boolean) => void;
  setSidebarCollapsed: (v: boolean) => void;
  setListsOpen: (v: boolean) => void;
  setFolderCollapsed: (folderId: string, collapsed: boolean) => void;
  setFolderOrder: (folderId: string, ids: string[]) => void;
  setListGroupOrder: (listId: string, groups: string[]) => void;
  setSyncEnabled: (v: boolean) => void;
  setLocalOnly: (v: boolean) => void;
}

const STORAGE_KEY = 'todo_settings';
const DEFAULT_ACCENT: AccentColor = 'blue';

const DEFAULTS: Settings = {
  accent: DEFAULT_ACCENT,
  theme: 'system',
  hiddenListIds: [],
  setupDone: false,
  showMyDay: true,
  pinnedOrder: [],
  customOrder: [],
  myDayOrder: [],
  listOrders: {},
  soundEnabled: true,
  soundStyle: 'pop',
  hapticEnabled: true,
  sidebarCollapsed: false,
  listsOpen: true,
  folderCollapsed: {},
  folderOrders: {},
  listGroupOrders: {},
  syncEnabled: true,
  localOnly: false,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s: Settings = { ...DEFAULTS, ...JSON.parse(raw) };
      // Migrate: reset removed accent colors
      if (!ACCENT_COLORS.find((c) => c.key === s.accent)) s.accent = DEFAULT_ACCENT;
      // Migrate: ensure 'my-day' is always in pinnedOrder
      if (!s.pinnedOrder.includes('my-day')) {
        s.pinnedOrder = ['my-day', ...s.pinnedOrder];
      }
      // Migrate: old showMyDay:false → hiddenListIds
      if (!s.showMyDay && !s.hiddenListIds.includes('my-day')) {
        s.hiddenListIds = ['my-day', ...s.hiddenListIds];
      }
      s.showMyDay = !s.hiddenListIds.includes('my-day');
      return s;
    }
  } catch {}
  // Default: My Day is on, so include sentinel
  return { ...DEFAULTS, pinnedOrder: ['my-day'] };
}

function saveSettings(s: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function drawFavicon(hex: string, isDark: boolean): string {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

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

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

function applyAccentVars(accent: AccentColor, theme: Theme) {
  const isDark = resolveIsDark(theme);
  const color = ACCENT_COLORS.find((c) => c.key === accent)!;
  const hex = isDark ? color.darkHex : color.hex;
  const [r, g, b] = hexToRgb(hex);
  const alpha = isDark ? 0.12 : 0.11;
  const root = document.documentElement;
  root.style.setProperty('--accent', hex);
  root.style.setProperty('--accent-dim', `rgba(${r}, ${g}, ${b}, ${alpha})`);
}

function applyFavicon(accent: AccentColor, theme: Theme) {
  const isDark = resolveIsDark(theme);
  const color = ACCENT_COLORS.find((c) => c.key === accent)!;
  const hex = isDark ? color.darkHex : color.hex;

  const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
  if (favicon) favicon.href = drawFavicon(hex, isDark);

  const themeColor = document.getElementById('theme-color') as HTMLMetaElement | null;
  if (themeColor) themeColor.content = hex;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const userRef   = useRef<User | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setSettings((prev) => {
          const next = cloud
            ? { ...prev, ...cloud }
            : {
                // No cloud settings — fresh user on this device, reset user-specific data
                ...prev,
                setupDone: false,
                pinnedOrder: ['my-day'],
                hiddenListIds: [],
                customOrder: [],
                myDayOrder: [],
                listOrders: {},
                folderOrders: {},
                folderCollapsed: {},
                listGroupOrders: {},
              };
          saveSettings(next);
          return next;
        });
      }
    });
    return unsub;
  }, []);

  function scheduleCloudPush(next: Settings) {
    if (!userRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushCloudSettings(userRef.current!.id, next).catch(console.error);
    }, 1000);
  }

  function update(patchOrFn: Partial<Settings> | ((prev: Settings) => Settings)) {
    setSettings((prev) => {
      const next = typeof patchOrFn === 'function' ? patchOrFn(prev) : { ...prev, ...patchOrFn };
      saveSettings(next);
      scheduleCloudPush(next);
      return next;
    });
  }

  const value: SettingsContextValue = {
    ...settings,
    setAccent: (accent) => update({ accent }),
    setTheme: (theme) => update({ theme }),
    toggleListVisibility: (listId) => update((prev) => {
      const hiddenListIds = prev.hiddenListIds.includes(listId)
        ? prev.hiddenListIds.filter((id) => id !== listId)
        : [...prev.hiddenListIds, listId];
      return { ...prev, hiddenListIds, showMyDay: !hiddenListIds.includes('my-day') };
    }),
    markSetupDone: () => update({ setupDone: true }),
    setPinnedOrder: (pinnedOrder) => update({ pinnedOrder }),
    setCustomOrder: (customOrder) => update({ customOrder }),
    setMyDayOrder: (myDayOrder) => update({ myDayOrder }),
    setListOrder: (listId, ids) =>
      update((prev) => ({ ...prev, listOrders: { ...prev.listOrders, [listId]: ids } })),
    setSoundEnabled: (soundEnabled) => update({ soundEnabled }),
    setSoundStyle: (soundStyle) => update({ soundStyle }),
    setHapticEnabled: (hapticEnabled) => update({ hapticEnabled }),
    setSidebarCollapsed: (sidebarCollapsed) => update({ sidebarCollapsed }),
    setListsOpen: (listsOpen) => update({ listsOpen }),
    setFolderCollapsed: (folderId, collapsed) =>
      update((prev) => ({ ...prev, folderCollapsed: { ...prev.folderCollapsed, [folderId]: collapsed } })),
    setFolderOrder: (folderId, ids) =>
      update((prev) => ({ ...prev, folderOrders: { ...prev.folderOrders, [folderId]: ids } })),
    setListGroupOrder: (listId, groups) =>
      update((prev) => ({ ...prev, listGroupOrders: { ...prev.listGroupOrders, [listId]: groups } })),
    setSyncEnabled: (syncEnabled) => update({ syncEnabled }),
    setLocalOnly: (v) => update({ localOnly: v, syncEnabled: v ? false : true }),
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
