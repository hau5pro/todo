# Review Todo

## Features

## Bugs

- issues with keyboard nav

## Improvements

- generate screenshots for help sections?

---

## Security (open items)

**serialize-javascript RCE** (4 high, `npm audit`) — transitive via `vite-plugin-pwa ≥ 0.20.0 → workbox-build → @rollup/plugin-terser`. Fix requires downgrading `vite-plugin-pwa` to `0.19.8` (breaking change). Dev-only build-time risk.

**Supabase dashboard (manual, no code fix):**

- L1: Restrict OAuth redirect allow-list to production origin(s)
- L2: Enable email confirmation on hosted project (`enable_confirmations = false` in local config only)
- L3: Raise minimum password length above 6 in dashboard
