import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMyDay } from '../../hooks/useMyDay';
import { createList as dbCreateList } from '../../db/lists';
import { createTask as dbCreateTask } from '../../db/tasks';
import { toggleHabitCompletion } from '../../db/habits';
import { getTodayString } from '../../utils/date';

function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('useMyDay', () => {
  it('starts with isLoading true', () => {
    const { result } = renderHook(() => useMyDay());
    expect(result.current.isLoading).toBe(true);
  });

  it('loads overdue tasks (due before today)', async () => {
    const list = await dbCreateList('Tasks', 'general');
    await dbCreateTask(list.id, 'Overdue task', { due_date: yesterday() });

    const { result } = renderHook(() => useMyDay());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.overdue.some((t) => t.title === 'Overdue task')).toBe(true);
  });

  it('loads today tasks (due today)', async () => {
    const list = await dbCreateList('Tasks', 'general');
    await dbCreateTask(list.id, 'Today task', { due_date: getTodayString() });

    const { result } = renderHook(() => useMyDay());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.today.some((t) => t.title === 'Today task')).toBe(true);
  });

  it('excludes future tasks', async () => {
    const list = await dbCreateList('Tasks', 'general');
    await dbCreateTask(list.id, 'Future task', { due_date: tomorrow() });

    const { result } = renderHook(() => useMyDay());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const all = [...result.current.overdue, ...result.current.today];
    expect(all.some((t) => t.title === 'Future task')).toBe(false);
  });

  it('loads habits from daily lists', async () => {
    const dailyList = await dbCreateList('Morning Routine', 'daily');
    await dbCreateTask(dailyList.id, 'Stretch');

    const { result } = renderHook(() => useMyDay());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.habits.some((h) => h.task.title === 'Stretch')).toBe(true);
  });

  it('marks habit as completedToday when toggled', async () => {
    const dailyList = await dbCreateList('Evening', 'daily');
    const task = await dbCreateTask(dailyList.id, 'Wind down');
    await toggleHabitCompletion(task.id, getTodayString());

    const { result } = renderHook(() => useMyDay());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const habit = result.current.habits.find((h) => h.task.id === task.id);
    expect(habit?.completedToday).toBe(true);
  });

  it('reload() refreshes the data', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const { result } = renderHook(() => useMyDay());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.today).toHaveLength(0);

    await dbCreateTask(list.id, 'New today task', { due_date: getTodayString() });
    result.current.reload();

    await waitFor(() =>
      expect(result.current.today.some((t) => t.title === 'New today task')).toBe(true)
    );
  });
});
