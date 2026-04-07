import { describe, it, expect } from 'vitest';
import { toggleHabitCompletion, getCompletionsForTask, calculateStreak } from '../../db/habits';
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

  it('returns 0 when today is not done but yesterday was', () => {
    // Gap on today means the active streak is 0 (user hasn't completed it yet today)
    const completions: HabitCompletion[] = [
      { id: '1', task_id: 'task-1', date: '2026-04-04', created_at: '', deleted_at: null, pending_sync: false },
      { id: '2', task_id: 'task-1', date: '2026-04-03', created_at: '', deleted_at: null, pending_sync: false },
    ];
    expect(calculateStreak(completions, 'task-1', '2026-04-05')).toBe(0);
  });
});
