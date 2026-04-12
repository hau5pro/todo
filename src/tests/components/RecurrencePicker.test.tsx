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
