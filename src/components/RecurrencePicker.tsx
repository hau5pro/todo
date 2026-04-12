import { useState, useEffect } from 'react';
import { RRule, Weekday } from 'rrule';

const WEEKDAY_CHIPS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const WEEKDAY_FULL  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const NTH_LABELS    = ['1st', '2nd', '3rd', '4th', 'Last'];
const NTH_VALUES    = [1, 2, 3, 4, -1];

const FREQ_PILLS = [
  { label: 'Daily',   value: RRule.DAILY   },
  { label: 'Weekly',  value: RRule.WEEKLY  },
  { label: 'Monthly', value: RRule.MONTHLY },
  { label: 'Yearly',  value: RRule.YEARLY  },
];

// 1–31 + last day (-1)
const DOM_VALUES = [...Array.from({ length: 31 }, (_, i) => i + 1), -1];

type MonthlyMode = 'day-of-month' | 'weekday-of-month';

interface State {
  freq: number;
  interval: number;
  byDay: Set<number>;       // weekly: selected weekdays (0=Mo..6=Su)
  monthlyMode: MonthlyMode;
  dayOfMonth: number;       // 1–31 or -1 (last)
  nthWeek: number;          // 1,2,3,4,-1
  nthWeekday: number;       // 0–6
}

const DEFAULTS: State = {
  freq: RRule.WEEKLY, interval: 1, byDay: new Set(),
  monthlyMode: 'day-of-month', dayOfMonth: 1, nthWeek: 1, nthWeekday: 0,
};

function parse(str: string): State {
  try {
    const rule  = new RRule(RRule.parseString(str));
    const o     = rule.options;
    // After normalization, nth weekdays live in bynweekday: Array<[weekday, n]>
    // plain weekdays stay in byweekday as numbers
    // rrule types bynweekday as number[][] but at runtime each entry is a [weekday, n] tuple
    const bynwd  = o.bynweekday as Array<[number, number]> | null;
    const bynmd  = o.bynmonthday;
    const bywd   = (o.byweekday  ?? []) as unknown as number[];
    const bmd    = (o.bymonthday ?? []) as number[];

    let monthlyMode: MonthlyMode = 'day-of-month';
    let dayOfMonth = bmd[0] ?? 1;
    let nthWeek = 1, nthWeekday = 0;

    if (o.freq === RRule.MONTHLY) {
      if (bynwd && bynwd.length > 0) {
        monthlyMode = 'weekday-of-month';
        nthWeekday  = bynwd[0][0];
        nthWeek     = bynwd[0][1];
      } else if (bmd.length > 0) {
        monthlyMode = 'day-of-month';
        dayOfMonth  = bmd[0];
      } else if (bynmd && bynmd.length > 0) {
        // negative bymonthday (e.g. -1 = last day) normalizes into bynmonthday
        monthlyMode = 'day-of-month';
        dayOfMonth  = bynmd[0];
      }
    }

    return {
      freq:     o.freq ?? RRule.WEEKLY,
      interval: o.interval ?? 1,
      byDay:    new Set(bywd),
      monthlyMode, dayOfMonth, nthWeek, nthWeekday,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function build(s: State): string {
  const line = (r: RRule) => {
    const full = r.toString();
    const l = full.split('\n').find((x) => x.startsWith('RRULE:'));
    return l ? l.slice(6) : full;
  };

  if (s.freq === RRule.WEEKLY) {
    const opts: ConstructorParameters<typeof RRule>[0] = { freq: RRule.WEEKLY, interval: s.interval };
    if (s.byDay.size > 0) opts.byweekday = Array.from(s.byDay).map((n) => new Weekday(n));
    return line(new RRule(opts));
  }
  if (s.freq === RRule.MONTHLY) {
    if (s.monthlyMode === 'weekday-of-month') {
      return line(new RRule({ freq: RRule.MONTHLY, interval: s.interval, byweekday: [new Weekday(s.nthWeekday, s.nthWeek)] }));
    }
    return line(new RRule({ freq: RRule.MONTHLY, interval: s.interval, bymonthday: [s.dayOfMonth] }));
  }
  return line(new RRule({ freq: s.freq, interval: s.interval }));
}

function unitLabel(freq: number, interval: number): string {
  const singular = freq === RRule.DAILY   ? 'day'
                 : freq === RRule.WEEKLY  ? 'week'
                 : freq === RRule.MONTHLY ? 'month'
                 : 'year';
  return interval === 1 ? singular : singular + 's';
}

interface Props {
  value: string | null;
  dueDate: string | null;
  onChange: (rrule: string | null) => void;
}

export function RecurrencePicker({ value, dueDate, onChange }: Props) {
  const disabled = !dueDate;
  const enabled  = value !== null && !disabled;

  const [s, setS] = useState<State>(() => value ? parse(value) : { ...DEFAULTS });

  useEffect(() => {
    if (value) setS(parse(value));
  }, [value]);

  function update(patch: Partial<State>) {
    setS((prev) => {
      const next = { ...prev, ...patch };
      onChange(build(next));
      return next;
    });
  }

  return (
    <div title={disabled ? 'Add a due date to enable recurrence' : undefined}>
    <div className={`rrule-picker${disabled ? ' rrule-picker--disabled' : ''}${enabled ? ' rrule-picker--on' : ''}`}>
      <div className="rrule-toggle-row">
        <span className="rrule-label">Repeat</span>
        <button
          type="button"
          className={`rrule-toggle${enabled ? ' rrule-toggle--on' : ''}`}
          onClick={() => enabled ? onChange(null) : onChange(build(s))}
          disabled={disabled}
          aria-label={enabled ? 'Disable recurrence' : 'Enable recurrence'}
          title={enabled ? 'Turn off recurrence' : 'Enable recurrence'}
        >
          <span className="rrule-toggle__thumb" />
        </button>
      </div>

      {enabled && (
        <div className="rrule-controls">

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

          {/* Frequency pills */}
          <div className="rrule-freq-pills">
            {FREQ_PILLS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`rrule-pill${s.freq === f.value ? ' rrule-pill--on' : ''}`}
                onClick={() => update({ freq: f.value })}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Weekly: day chips */}
          {s.freq === RRule.WEEKLY && (
            <div className="rrule-day-chips">
              {WEEKDAY_CHIPS.map((label, n) => (
                <button
                  key={n}
                  type="button"
                  className={`rrule-chip${s.byDay.has(n) ? ' rrule-chip--on' : ''}`}
                  onClick={() => {
                    const next = new Set(s.byDay);
                    next.has(n) ? next.delete(n) : next.add(n);
                    update({ byDay: next });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Monthly */}
          {s.freq === RRule.MONTHLY && (
            <div className="rrule-monthly">
              <div className="rrule-mode-tabs">
                <button
                  type="button"
                  className={`rrule-mode-tab${s.monthlyMode === 'day-of-month' ? ' rrule-mode-tab--on' : ''}`}
                  onClick={() => update({ monthlyMode: 'day-of-month' })}
                >
                  Day of month
                </button>
                <button
                  type="button"
                  className={`rrule-mode-tab${s.monthlyMode === 'weekday-of-month' ? ' rrule-mode-tab--on' : ''}`}
                  onClick={() => update({ monthlyMode: 'weekday-of-month' })}
                >
                  Day of week
                </button>
              </div>

              {s.monthlyMode === 'day-of-month' && (
                <div className="rrule-dom-grid">
                  {DOM_VALUES.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`rrule-dom-btn${s.dayOfMonth === v ? ' rrule-dom-btn--on' : ''}${v === -1 ? ' rrule-dom-btn--last' : ''}`}
                      onClick={() => update({ dayOfMonth: v })}
                    >
                      {v === -1 ? 'Last' : v}
                    </button>
                  ))}
                </div>
              )}

              {s.monthlyMode === 'weekday-of-month' && (
                <div className="rrule-nth-section">
                  <div className="rrule-nth-pills">
                    {NTH_VALUES.map((v, i) => (
                      <button
                        key={v}
                        type="button"
                        className={`rrule-pill${s.nthWeek === v ? ' rrule-pill--on' : ''}`}
                        onClick={() => update({ nthWeek: v })}
                      >
                        {NTH_LABELS[i]}
                      </button>
                    ))}
                  </div>
                  <div className="rrule-day-chips">
                    {WEEKDAY_CHIPS.map((label, n) => (
                      <button
                        key={n}
                        type="button"
                        className={`rrule-chip${s.nthWeekday === n ? ' rrule-chip--on' : ''}`}
                        onClick={() => update({ nthWeekday: n })}
                        title={WEEKDAY_FULL[n]}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
    </div>
  );
}
