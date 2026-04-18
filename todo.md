# Review Todo

## Features

- ~~confetti.js on completing all daily habits. make it a setting.~~ ✓

## Bugs

- ~~when i click off of details and i happen to hit another task, details should just switch to that task and not collapse~~ ✓
- ~~elipsis habit note should have tooltip~~ ✓
- toggle two habits back and forth, eventually the other one 'toggles' weird sm thing?
- maybe make my day not persist the items
- groups dont persist on new load (the ones in the current view)
- ~~add task no underline??~~ ✓

## Improvements

---

## Security (open items)

**serialize-javascript RCE** (4 high, `npm audit`) — transitive via `vite-plugin-pwa ≥ 0.20.0 → workbox-build → @rollup/plugin-terser`. Fix requires downgrading `vite-plugin-pwa` to `0.19.8` (breaking change). Dev-only build-time risk.
