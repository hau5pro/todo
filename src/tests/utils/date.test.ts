import { describe, it, expect } from 'vitest';
import { formatLocalDate, formatTime } from '../../utils/date';

describe('formatLocalDate', () => {
  it('formats a typical date with zero-padded month and day', () => {
    expect(formatLocalDate(new Date(2024, 2, 5))).toBe('2024-03-05');
  });

  it('zero-pads single-digit month and day', () => {
    expect(formatLocalDate(new Date(2024, 0, 9))).toBe('2024-01-09');
  });

  it('handles end-of-month (last day of January)', () => {
    expect(formatLocalDate(new Date(2024, 0, 31))).toBe('2024-01-31');
  });

  it('handles year boundary — Dec 31', () => {
    expect(formatLocalDate(new Date(2023, 11, 31))).toBe('2023-12-31');
  });

  it('handles year boundary — Jan 1', () => {
    expect(formatLocalDate(new Date(2024, 0, 1))).toBe('2024-01-01');
  });

  it('formats a date in the middle of the year', () => {
    expect(formatLocalDate(new Date(2025, 5, 15))).toBe('2025-06-15');
  });
});

describe('formatTime', () => {
  it('formats midnight (00:00) as 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM');
  });

  it('formats noon (12:00) as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM');
  });

  it('formats an AM hour (09:30)', () => {
    expect(formatTime('09:30')).toBe('9:30 AM');
  });

  it('formats a PM hour (15:45)', () => {
    expect(formatTime('15:45')).toBe('3:45 PM');
  });

  it('formats single-digit minutes with zero-padding (10:05)', () => {
    expect(formatTime('10:05')).toBe('10:05 AM');
  });

  it('formats 11:59 AM correctly', () => {
    expect(formatTime('11:59')).toBe('11:59 AM');
  });

  it('formats 13:00 as 1:00 PM', () => {
    expect(formatTime('13:00')).toBe('1:00 PM');
  });

  it('formats 23:59 as 11:59 PM', () => {
    expect(formatTime('23:59')).toBe('11:59 PM');
  });
});
