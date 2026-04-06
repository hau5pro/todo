import { useState } from 'react';
import dayjs from 'dayjs';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { ICON_SIZE } from '../config/icons';

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS_PER_PAGE = 12;

type View = 'days' | 'months' | 'years';

function yearBlockStart(year: number) {
  return Math.floor(year / YEARS_PER_PAGE) * YEARS_PER_PAGE;
}

interface Props {
  value: string | null;
  onChange: (date: string | null) => void;
}

export function CalendarPicker({ value, onChange }: Props) {
  const todayStr = dayjs().format('YYYY-MM-DD');
  const thisYear = dayjs().year();
  const MIN_YEAR = thisYear - 5;
  const MAX_YEAR = thisYear + 20;

  const [viewMonth, setViewMonth] = useState(() =>
    dayjs(value || todayStr).startOf('month')
  );
  const [view, setView] = useState<View>('days');

  // ── Day view ──────────────────────────────────────────────

  function renderDays() {
    const firstDayOffset = viewMonth.day();
    const daysInMonth = viewMonth.daysInMonth();
    const cells: (number | null)[] = [
      ...Array<null>(firstDayOffset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <>
        <div className="cal__header">
          <button className="cal__nav" type="button"
            onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}>
            <CaretLeft size={ICON_SIZE} weight="fill" />
          </button>
          <button className="cal__heading-btn" type="button" onClick={() => setView('months')}>
            {viewMonth.format('MMMM YYYY')}
          </button>
          <button className="cal__nav" type="button"
            onClick={() => setViewMonth((m) => m.add(1, 'month'))}>
            <CaretRight size={ICON_SIZE} weight="fill" />
          </button>
        </div>
        <div className="cal__grid">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="cal__day-header">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const dateStr = viewMonth.date(day).format('YYYY-MM-DD');
            const isSelected = dateStr === value;
            const isToday = dateStr === todayStr;
            return (
              <button
                key={dateStr}
                type="button"
                className={[
                  'cal__day',
                  isSelected ? 'cal__day--selected' : '',
                  isToday && !isSelected ? 'cal__day--today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onChange(isSelected ? null : dateStr)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ── Month view ────────────────────────────────────────────

  function renderMonths() {
    const year = viewMonth.year();
    return (
      <>
        <div className="cal__header">
          <button className="cal__nav" type="button"
            disabled={year - 1 < MIN_YEAR}
            onClick={() => setViewMonth((m) => m.subtract(1, 'year'))}>
            <CaretLeft size={ICON_SIZE} weight="fill" />
          </button>
          <button className="cal__heading-btn" type="button" onClick={() => setView('years')}>
            {year}
          </button>
          <button className="cal__nav" type="button"
            disabled={year + 1 > MAX_YEAR}
            onClick={() => setViewMonth((m) => m.add(1, 'year'))}>
            <CaretRight size={ICON_SIZE} weight="fill" />
          </button>
        </div>
        <div className="cal__month-grid">
          {MONTH_LABELS.map((label, i) => {
            const isSelected = value
              ? dayjs(value).year() === year && dayjs(value).month() === i
              : false;
            const isCurrentMonth = dayjs().year() === year && dayjs().month() === i;
            return (
              <button
                key={label}
                type="button"
                className={[
                  'cal__month-cell',
                  isSelected ? 'cal__month-cell--selected' : '',
                  isCurrentMonth && !isSelected ? 'cal__month-cell--today' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  setViewMonth(dayjs(new Date(year, i, 1)));
                  setView('days');
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ── Year view ─────────────────────────────────────────────

  function renderYears() {
    const blockStart = yearBlockStart(viewMonth.year());
    const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => blockStart + i);

    return (
      <>
        <div className="cal__header">
          <button className="cal__nav" type="button"
            disabled={blockStart <= MIN_YEAR}
            onClick={() => setViewMonth((m) => m.subtract(YEARS_PER_PAGE, 'year'))}>
            <CaretLeft size={ICON_SIZE} weight="fill" />
          </button>
          <span className="cal__heading-btn cal__heading-btn--static">
            {blockStart} – {blockStart + YEARS_PER_PAGE - 1}
          </span>
          <button className="cal__nav" type="button"
            disabled={blockStart + YEARS_PER_PAGE > MAX_YEAR}
            onClick={() => setViewMonth((m) => m.add(YEARS_PER_PAGE, 'year'))}>
            <CaretRight size={ICON_SIZE} weight="fill" />
          </button>
        </div>
        <div className="cal__year-grid">
          {years.map((y) => {
            const outOfRange = y < MIN_YEAR || y > MAX_YEAR;
            const isSelected = value ? dayjs(value).year() === y : false;
            const isThisYear = thisYear === y;
            return (
              <button
                key={y}
                type="button"
                disabled={outOfRange}
                className={[
                  'cal__year-cell',
                  isSelected ? 'cal__year-cell--selected' : '',
                  isThisYear && !isSelected ? 'cal__year-cell--today' : '',
                  outOfRange ? 'cal__year-cell--disabled' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => {
                  setViewMonth((m) => m.year(y));
                  setView('months');
                }}
              >
                {y}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="cal">
      {view === 'days'   && renderDays()}
      {view === 'months' && renderMonths()}
      {view === 'years'  && renderYears()}
    </div>
  );
}
