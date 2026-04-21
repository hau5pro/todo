import { describe, it, expect } from 'vitest';
import { toggleHabitCompletion, getCompletionsForTask, getTodayCompletions, calculateStreak } from '../../db/habits';
import { createList } from '../../db/lists';
import { createTask } from '../../db/tasks';
import type { HabitCompletion } from '../../types';

describe('habit completions', () => {
  it('toggleHabitCompletion adds a completion for a date', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Stretch');
    const result = await toggleHabitCompletion(task.id, '2026-04-05');
    expect(result).toBe('added');
    const completions = await getCompletionsForTask(task.id);
    expect(completions).toHaveLength(1);
    expect(completions[0].date).toBe('2026-04-05');
  });

  it('toggleHabitCompletion removes completion when already done', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Meditate');
    await toggleHabitCompletion(task.id, '2026-04-05');
    const result = await toggleHabitCompletion(task.id, '2026-04-05');
    expect(result).toBe('removed');
    const completions = await getCompletionsForTask(task.id);
    expect(completions.filter(c => c.deleted_at === null)).toHaveLength(0);
  });

  it('toggleHabitCompletion restore path: re-toggling a soft-deleted record sets deleted_at to null', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Run');

    // Add then remove (soft-delete)
    await toggleHabitCompletion(task.id, '2026-04-05');
    await toggleHabitCompletion(task.id, '2026-04-05');

    // Re-toggle: should restore (set deleted_at back to null) and return 'added'
    const result = await toggleHabitCompletion(task.id, '2026-04-05');
    expect(result).toBe('added');

    const completions = await getCompletionsForTask(task.id);
    const active = completions.filter(c => c.deleted_at === null);
    expect(active).toHaveLength(1);
    expect(active[0].deleted_at).toBeNull();
  });

  it('getTodayCompletions returns active completions for the given date', async () => {
    const list = await createList('Habits', 'daily');
    const task1 = await createTask(list.id, 'Morning stretch');
    const task2 = await createTask(list.id, 'Evening read');

    await toggleHabitCompletion(task1.id, '2026-04-05');
    await toggleHabitCompletion(task2.id, '2026-04-05');
    // Also add one for a different date — should NOT appear
    await toggleHabitCompletion(task1.id, '2026-04-04');

    const todays = await getTodayCompletions('2026-04-05');
    expect(todays).toHaveLength(2);
    expect(todays.every(c => c.date === '2026-04-05')).toBe(true);
    expect(todays.every(c => c.deleted_at === null)).toBe(true);
  });

  it('getTodayCompletions excludes soft-deleted completions', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Yoga');

    // Add then soft-delete
    await toggleHabitCompletion(task.id, '2026-04-05');
    await toggleHabitCompletion(task.id, '2026-04-05');

    const todays = await getTodayCompletions('2026-04-05');
    expect(todays).toHaveLength(0);
  });

  it('getTodayCompletions returns empty array when no completions exist for that date', async () => {
    const todays = await getTodayCompletions('2026-04-05');
    expect(todays).toHaveLength(0);
  });
});

describe('calculateStreak', () => {
  it('returns 0 when no completions', () => {
    expect(calculateStreak([], 'task-1', '2026-04-05')).toBe(0);
  });

  it('returns 1 when only today completed', () => {
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'task-1', date: '2026-04-05', created_at: '', deleted_at: null, pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(1);
  });

  it('counts consecutive days from today', () => {
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'task-1', date: '2026-04-05', created_at: '', deleted_at: null, pending_sync: false },
      { id: '2', task_id: 'task-1', date: '2026-04-04', created_at: '', deleted_at: null, pending_sync: false },
      { id: '3', task_id: 'task-1', date: '2026-04-03', created_at: '', deleted_at: null, pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(3);
  });

  it('stops at gap in streak', () => {
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'task-1', date: '2026-04-05', created_at: '', deleted_at: null, pending_sync: false },
      // gap on 2026-04-04
      { id: '2', task_id: 'task-1', date: '2026-04-03', created_at: '', deleted_at: null, pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(1);
  });

  it('ignores soft-deleted completions in streak', () => {
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'task-1', date: '2026-04-05', created_at: '', deleted_at: '2026-04-05T10:00:00Z', pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(0);
  });

  it('ignores completions for other tasks', () => {
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'other-task', date: '2026-04-05', created_at: '', deleted_at: null, pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(0);
  });

  it('returns streak from yesterday when today is not yet done', () => {
    // Today is skipped — streak stays alive based on yesterday so the badge shows before completion
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'task-1', date: '2026-04-04', created_at: '', deleted_at: null, pending_sync: false },
      { id: '2', task_id: 'task-1', date: '2026-04-03', created_at: '', deleted_at: null, pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(2);
  });

  it('returns 0 when today and yesterday are both not done', () => {
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'task-1', date: '2026-04-03', created_at: '', deleted_at: null, pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(0);
  });
});
