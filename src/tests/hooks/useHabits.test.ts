import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useHabits } from '../../hooks/useHabits';
import { createList as dbCreateList } from '../../db/lists';
import { createTask as dbCreateTask } from '../../db/tasks';
import { toggleHabitCompletion } from '../../db/habits';
import { getTodayString } from '../../utils/date';

describe('useHabits', () => {
  it('loads habit rows for a daily list', async () => {
    const list = await dbCreateList('Morning Routine', 'daily');
    await dbCreateTask(list.id, 'Meditate');
    await dbCreateTask(list.id, 'Exercise');

    const { result } = renderHook(() => useHabits(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.rows.map((r) => r.task.title).sort()).toEqual([
      'Exercise',
      'Meditate',
    ]);
  });

  it('marks completedToday when task was completed today', async () => {
    const list = await dbCreateList('Habits', 'daily');
    const task = await dbCreateTask(list.id, 'Journal');
    await toggleHabitCompletion(task.id, getTodayString());

    const { result } = renderHook(() => useHabits(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const row = result.current.rows.find((r) => r.task.id === task.id);
    expect(row?.completedToday).toBe(true);
  });

  it('completedToday is false for tasks not completed today', async () => {
    const list = await dbCreateList('Habits', 'daily');
    await dbCreateTask(list.id, 'Read');

    const { result } = renderHook(() => useHabits(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows[0].completedToday).toBe(false);
  });

  it('returns empty rows for an empty list', async () => {
    const list = await dbCreateList('Empty Habits', 'daily');

    const { result } = renderHook(() => useHabits(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.rows).toHaveLength(0);
  });

  it('starts with isLoading true', () => {
    const { result } = renderHook(() => useHabits('any-id'));
    expect(result.current.isLoading).toBe(true);
  });

  it('returns today string', async () => {
    const list = await dbCreateList('Habits', 'daily');
    const { result } = renderHook(() => useHabits(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.today).toBe(getTodayString());
  });

  it('reload() re-fetches and reflects new tasks added after initial load', async () => {
    const list = await dbCreateList('Reload Habits', 'daily');

    const { result } = renderHook(() => useHabits(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.rows).toHaveLength(0);

    await dbCreateTask(list.id, 'New habit task');
    await act(async () => {
      result.current.reload();
    });

    await waitFor(() =>
      expect(result.current.rows.some((r) => r.task.title === 'New habit task')).toBe(true)
    );
  });

  it('reload() returns the fresh HabitRow[]', async () => {
    const list = await dbCreateList('Return Test', 'daily');
    const task = await dbCreateTask(list.id, 'Stretch');

    const { result } = renderHook(() => useHabits(list.id));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Complete the task then reload — returned rows should reflect the change
    await toggleHabitCompletion(task.id, getTodayString());

    let returnedRows: import('../../hooks/useHabits').HabitRow[] = [];
    await act(async () => {
      returnedRows = await result.current.reload();
    });

    expect(returnedRows.find((r) => r.task.id === task.id)?.completedToday).toBe(true);
  });
});
