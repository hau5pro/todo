# Review Todo

## Features

## Bugs

## Improvements

---

## Security Review (2026-04-10)

### High

**H1. Vulnerable dev dependencies — 5 high-severity findings (npm audit)**

- `vite` ≤6.4.1: path traversal in optimised-deps `.map` handling (`GHSA-4w7w-66w2-5vf9`) and arbitrary file read via dev-server WebSocket (`GHSA-p9ff-h696-f583`). Exploitable on any dev machine that binds Vite beyond `localhost`.
- `serialize-javascript` ≤7.0.4 (transitive: `vite-plugin-pwa → workbox-build → @rollup/plugin-terser`): RCE via crafted `RegExp.flags` / `Date.prototype.toISOString()` at build time.

**Fix:** `npm audit fix` for vite (non-breaking). Check `vite-plugin-pwa` for a compatible bump to clear the `serialize-javascript` chain.

---

### Medium

**M1. Service worker: no sensitive-response caching today, but no guard for the future**

`src/sw/service-worker.ts` uses `precacheAndRoute(self.__WB_MANIFEST)` — static shell only, no runtime caching of Supabase responses. Safe today.

Risk: the project uses `strategies: 'injectManifest'` (`vite.config.ts:27`). If a future contributor adds a `registerRoute` for `supabase.co`, authenticated API responses would be persisted in Cache Storage and survive sign-out.

**Fix:** Document the rule in `CLAUDE.md` or the service worker: *never add runtime caching for `supabase.co` routes*.

**M2. `localStorage.clear()` on account delete is broader than needed**

`src/views/SettingsView.tsx:80` — `handleDeleteAll()` calls `localStorage.clear()`, wiping all origin storage. Low blast radius for a standalone PWA that owns its origin, but unnecessarily broad.

**Fix:** Replace with targeted `localStorage.removeItem('todo_settings_v1')` and `localStorage.removeItem('todo_last_sync')` (the only two keys the app writes).

---

### Low / Informational

**L1. OAuth redirect allow-list — verify production scope**

`src/supabase/auth.ts:7` uses `window.location.origin` for `redirectTo`. Safe — browser-controlled. But confirm the Supabase project's Auth → URL Configuration allow-list in production is restricted to the real origin(s) so a different deploy can't complete the OAuth flow with the same project credentials.

**L2. Email confirmation disabled in local config**

`supabase/config.toml:216` — `enable_confirmations = false`. Local dev only. Verify the hosted project has email confirmation enabled to prevent account takeover via typo-squatted email address.

**L3. Minimum password length is 6**

`supabase/config.toml:175` — `minimum_password_length = 6`, no complexity requirement. Below common hardening guidance (8+ recommended). Configure in Supabase dashboard for the hosted project.

---

### No Issues Found

- **XSS** — zero matches for `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `new Function(` across `src/`. React's default escaping is in effect throughout.
- **Hardcoded credentials in source** — no service-role key, access token, or DB password in any tracked file.
- **Supabase client** — correctly uses the anon/publishable key (`VITE_SUPABASE_ANON_KEY`), not a service key.
- **Row Level Security** — all six user-scoped tables have RLS enabled with `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`. A malicious client cannot read or write another user's rows.
- **Sync payload scoping** — `toRemote()` (`src/db/sync.ts:8`) strips `pending_sync` and stamps `user_id` from the authenticated session. `deleteAllCloudData` uses `.eq('user_id', userId)` with RLS as a second layer.
- **Network I/O** — no raw `fetch()` or `XMLHttpRequest` in `src/`. All network calls go through the Supabase SDK.
- **Service worker** — precache-only, no cached auth responses.
- **localStorage** — contains only UI preferences (accent, theme, ordering) and a sync timestamp. No PII or tokens.
