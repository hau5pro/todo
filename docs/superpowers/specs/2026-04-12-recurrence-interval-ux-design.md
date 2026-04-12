# Recurrence Interval UX — Design Spec

**Date:** 2026-04-12

## Problem

The `RecurrencePicker` already supports custom intervals (any integer via a stepper), but the stepper and the frequency pill feel disconnected. Setting interval=3 and pressing "Weekly" does not read as "every 3 weeks" — there is no label tying the two controls together, making the feature non-obvious.

## Solution

Add a live unit label immediately after the stepper so the row reads as a natural sentence:

```
Every  [−] [3] [+]  weeks
[Daily]  [Weekly]  [Monthly]  [Yearly]
```

The label is derived from the selected frequency (`freq` state) and the current interval:

| freq    | interval=1 | interval>1 |
|---------|-----------|------------|
| DAILY   | day       | days       |
| WEEKLY  | week      | weeks      |
| MONTHLY | month     | months     |
| YEARLY  | year      | years      |

The frequency pills remain below the interval row and continue to set `freq`. They now visually double as the unit selector.

## Scope

**`src/components/RecurrencePicker.tsx`**
- Add a `<span>` unit label after the stepper `<div>` inside `.rrule-interval-row`
- Label text: computed from `s.freq` and `s.interval` — singular when interval is 1, plural otherwise

**`src/app.css`**
- Style the unit label with `.rrule-muted` (existing class) so it reads as part of the same sentence as the "Every" label

## Out of scope

- No changes to `build()`, `parse()`, or any rrule logic
- No changes to the frequency pills, day chips, or monthly controls
- No new preset buttons or shortcuts
