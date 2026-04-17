# Confetti on Habit Completion — Design

## Summary

Fire a subtle confetti burst on every habit check, and a full-screen confetti shower when all habits in the daily list are completed. Gated by a user-facing setting.

---

## 1. Dependency

Install `canvas-confetti` (npm). ~7 KB gzipped, no sub-dependencies.

```
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

---

## 2. Settings

**File:** `src/contexts/SettingsContext.tsx`

- Add `confettiEnabled: boolean` to the `Settings` interface.
- Default value: `true`.
- Add `setConfettiEnabled: (v: boolean) => void` to `SettingsContextValue`.
- Implement setter following the same pattern as `setSoundEnabled`.

**File:** `src/views/SettingsView.tsx`

- Add a `SettingsRow` toggle for "Confetti" under the sound/haptic section.
- Label: `"Confetti"`, sublabel: `"celebrate completed habits"`.

---

## 3. Confetti Utility

**File:** `src/utils/confetti.ts`

Two named exports:

### `burstFromElement(el: HTMLElement)`

Fires a small burst originating from the element's center.

```ts
origin: {
  x: (rect.left + rect.width / 2) / window.innerWidth,
  y: (rect.top + rect.height / 2) / window.innerHeight,
}
particleCount: 30
spread: 60
startVelocity: 20
ticks: 80
```

### `burstFullScreen()`

Fires two simultaneous cannons (left + right edges), classic shower effect.

```ts
// Left cannon
{ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 } }
// Right cannon
{ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 } }
```

Both functions are no-ops if called in a server/SSR context (guard with `typeof window === 'undefined'`).

---

## 4. Trigger Logic

**File:** `src/views/DailyView.tsx`

### Element lookup

Each habit checkbox element gets a `data-habit-id` attribute set to the task ID. After toggle, look up:

```ts
const el = document.querySelector(`[data-habit-id="${taskId}"]`);
```

**File:** `src/components/HabitItem.tsx` (or `AnimatedCheckbox.tsx` — whichever renders the checkbox)

Add `data-habit-id={id}` to the checkbox/button element.

### `handleToggle` update

```ts
const handleToggle = useCallback(async (taskId: string) => {
  await toggleHabitCompletion(taskId, today);
  const freshRows = await reload(); // reload returns HabitRow[]
  requestSync();

  if (!confettiEnabled) return;

  // Per-habit burst
  const el = document.querySelector(`[data-habit-id="${taskId}"]`);
  if (el instanceof HTMLElement) burstFromElement(el);

  // All-done burst — only fires when toggling ON (not off)
  const wasCompletion = !rows.find(r => r.task.id === taskId)?.completedToday;
  if (wasCompletion && freshRows.every(r => r.completedToday)) {
    burstFullScreen();
  }
}, [today, reload, confettiEnabled, rows]);
```

### `useHabits` change

Update `load()` to return `HabitRow[]` so `handleToggle` can read fresh state synchronously after `await reload()`.

---

## 5. Scope

- No confetti on un-toggle (checking off → unchecking).
- Full-screen burst fires every time the last habit is checked (not once-per-day gated).
- No animation changes to `AnimatedCheckbox` beyond the `data-habit-id` attribute.
- Setting persists via existing `SettingsContext` localStorage mechanism.
