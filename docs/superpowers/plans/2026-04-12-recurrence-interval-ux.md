# Recurrence Interval UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a live unit label after the interval stepper so the row reads "Every [3] weeks" instead of the disconnected "Every [3]" + separate frequency pill.

**Architecture:** Single-file JSX change — add a `<span>` with computed text derived from existing `s.freq` and `s.interval` state. No logic, no rrule, no store changes.

**Tech Stack:** React 18, TypeScript, Vitest, @testing-library/react

---

### Task 1: Add unit label to RecurrencePicker

**Files:**
- Modify: `src/components/RecurrencePicker.tsx`
- Test: `src/tests/components/RecurrencePicker.test.tsx` (create)

- [ ] **Step 1: Create the test file**

```tsx
// src/tests/components/RecurrencePicker.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { RecurrencePicker } from '../../components/RecurrencePicker';

describe('RecurrencePicker unit label', () => {
  const noop = vi.fn();
  const TODAY = '2026-04-12';

  it('shows "week" when interval is 1 and frequency is weekly', () => {
    render(
      <RecurrencePicker
        value="FREQ=WEEKLY;INTERVAL=1"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('week')).toBeInTheDocument();
  });

  it('shows "weeks" when interval is 3 and frequency is weekly', () => {
    render(
      <RecurrencePicker
        value="FREQ=WEEKLY;INTERVAL=3"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('weeks')).toBeInTheDocument();
  });

  it('shows "month" when interval is 1 and frequency is monthly', () => {
    render(
      <RecurrencePicker
        value="FREQ=MONTHLY;INTERVAL=1"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('month')).toBeInTheDocument();
  });

  it('shows "months" when interval is 2 and frequency is monthly', () => {
    render(
      <RecurrencePicker
        value="FREQ=MONTHLY;INTERVAL=2"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('months')).toBeInTheDocument();
  });

  it('shows "day" when interval is 1 and frequency is daily', () => {
    render(
      <RecurrencePicker
        value="FREQ=DAILY;INTERVAL=1"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('day')).toBeInTheDocument();
  });

  it('shows "days" when interval is 5 and frequency is daily', () => {
    render(
      <RecurrencePicker
        value="FREQ=DAILY;INTERVAL=5"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('shows "year" when interval is 1 and frequency is yearly', () => {
    render(
      <RecurrencePicker
        value="FREQ=YEARLY;INTERVAL=1"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('year')).toBeInTheDocument();
  });

  it('updates label when frequency pill is changed', async () => {
    const user = userEvent.setup();
    render(
      <RecurrencePicker
        value="FREQ=WEEKLY;INTERVAL=2"
        dueDate={TODAY}
        onChange={noop}
      />
    );
    expect(screen.getByText('weeks')).toBeInTheDocument();
    await user.click(screen.getByText('Monthly'));
    expect(screen.getByText('months')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/tests/components/RecurrencePicker.test.tsx
```

Expected: FAIL — `getByText('week')` not found (label doesn't exist yet).

- [ ] **Step 3: Add the `unitLabel` helper and span to `RecurrencePicker.tsx`**

Add a helper function just above the `RecurrencePicker` component function (after the `build` function, around line 98):

```ts
function unitLabel(freq: number, interval: number): string {
  const singular = freq === RRule.DAILY   ? 'day'
                 : freq === RRule.WEEKLY  ? 'week'
                 : freq === RRule.MONTHLY ? 'month'
                 : 'year';
  return interval === 1 ? singular : singular + 's';
}
```

Then in the JSX, find the closing `</div>` of `.rrule-stepper` (the `[−][1][+]` widget) and add the span immediately after it inside `.rrule-interval-row`:

```tsx
{/* Before (around line 165): */}
            </div>
          </div>

{/* After: */}
            </div>
            <span className="rrule-muted">{unitLabel(s.freq, s.interval)}</span>
          </div>
```

The full interval row block should now look like:

```tsx
          {/* Interval */}
          <div className="rrule-interval-row">
            <span className="rrule-muted">Every</span>
            <div className="rrule-stepper">
              <button
                type="button"
                className="rrule-stepper__btn"
                onClick={() => update({ interval: Math.max(1, s.interval - 1) })}
                aria-label="Decrease interval"
              >−</button>
              <input
                type="number"
                className="rrule-interval-input"
                value={s.interval}
                min={1}
                onChange={(e) => update({ interval: Math.max(1, parseInt(e.target.value) || 1) })}
              />
              <button
                type="button"
                className="rrule-stepper__btn"
                onClick={() => update({ interval: s.interval + 1 })}
                aria-label="Increase interval"
              >+</button>
            </div>
            <span className="rrule-muted">{unitLabel(s.freq, s.interval)}</span>
          </div>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/tests/components/RecurrencePicker.test.tsx
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
npx vitest run
```

Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/RecurrencePicker.tsx src/tests/components/RecurrencePicker.test.tsx
git commit -m "fix: show unit label after interval stepper in RecurrencePicker

Adds 'Every 3 weeks' / 'Every 2 months' readability by appending a
live singular/plural unit label next to the stepper."
```
