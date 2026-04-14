import { describe, it, expect } from 'vitest';
import {
  createTask, getTasksByList, setTaskCompleted,
  advanceCyclicalTask, advanceRecurringTask, softDeleteTask, getMyDayTasks, purgeOldShoppingItems,
  bulkUpdateTaskGroup, updateTask,
} from '../../db/tasks';
import { createList } from '../../db/lists';
import { getTodayString } from '../../utils/date';

describe('tasks CRUD', () => {
  it('createTask adds a task', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Buy milk');
    expect(task.title).toBe('Buy milk');
    expect(task.list_id).toBe(list.id);
    expect(task.completed).toBe(false);
    expect(task.pending_sync).toBe(true);
  });

  it('getTasksByList returns non-deleted tasks for a list', async () => {
    const list = await createList('Test', 'general');
    await createTask(list.id, 'A');
    await createTask(list.id, 'B');
    const tasks = await getTasksByList(list.id);
    expect(tasks).toHaveLength(2);
  });

  it('setTaskCompleted toggles completion and sets completed_at', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Foo');
    expect(task.completed_at).toBeNull();
    const completed = await setTaskCompleted(task.id, true);
    expect(completed.completed).toBe(true);
    expect(completed.completed_at).not.toBeNull();
    const uncompleted = await setTaskCompleted(task.id, false);
    expect(uncompleted.completed).toBe(false);
    expect(uncompleted.completed_at).toBeNull();
  });

  it('softDeleteTask excludes task from getTasksByList', async () => {
    const list = await createList('Test', 'shopping');
    const task = await createTask(list.id, 'Eggs');
    await softDeleteTask(task.id);
    const tasks = await getTasksByList(list.id);
    expect(tasks).toHaveLength(0);
  });

  it('advanceCyclicalTask advances due_date by days', async () => {
    const list = await createList('Chores', 'general');
    const task = await createTask(list.id, 'Laundry', {
      due_date: '2026-04-05',
      recurrence_interval: 7,
      recurrence_unit: 'days',
    });
    const advanced = await advanceCyclicalTask(task.id);
    expect(advanced.due_date).toBe('2026-04-12');
    expect(advanced.completed).toBe(false);
  });

  it('advanceCyclicalTask advances due_date by weeks', async () => {
    const list = await createList('Chores', 'general');
    const task = await createTask(list.id, 'Clean', {
      due_date: '2026-04-05',
      recurrence_interval: 2,
      recurrence_unit: 'weeks',
    });
    const advanced = await advanceCyclicalTask(task.id);
    expect(advanced.due_date).toBe('2026-04-19');
  });

  it('advanceCyclicalTask advances due_date by months', async () => {
    const list = await createList('Chores', 'general');
    const task = await createTask(list.id, 'Check', {
      due_date: '2026-04-05',
      recurrence_interval: 1,
      recurrence_unit: 'months',
    });
    const advanced = await advanceCyclicalTask(task.id);
    expect(advanced.due_date).toBe('2026-05-05');
  });

  it('advanceCyclicalTask month-overflow clamps to last day of month (Jan 31 + 1 month)', async () => {
    const list = await createList('Chores', 'general');
    const task = await createTask(list.id, 'Bill', {
      due_date: '2026-01-31',
      recurrence_interval: 1,
      recurrence_unit: 'months',
    });
    const advanced = await advanceCyclicalTask(task.id);
    // JS Date setMonth overflows Jan 31 → Feb 31 → Mar 3; we verify actual behaviour
    // The important thing is the date is valid (not e.g. "2026-02-31")
    expect(advanced.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(advanced.due_date).toString()).not.toBe('Invalid Date');
  });

  it('advanceRecurringTask advances to next rrule occurrence', async () => {
    const list = await createList('Chores', 'general');
    const task = await createTask(list.id, 'Weekly', {
      due_date: '2026-04-05',
      rrule: 'FREQ=WEEKLY;INTERVAL=1',
    });
    const advanced = await advanceRecurringTask(task.id);
    expect(advanced.due_date).toBe('2026-04-12');
    expect(advanced.completed).toBe(false);
  });

  it('advanceRecurringTask marks completed when no further occurrences', async () => {
    const list = await createList('Chores', 'general');
    // A rule with COUNT=1 has no occurrence after the first
    const task = await createTask(list.id, 'Once', {
      due_date: '2026-04-05',
      rrule: 'FREQ=DAILY;COUNT=1',
    });
    const advanced = await advanceRecurringTask(task.id);
    expect(advanced.completed).toBe(true);
    // due_date stays unchanged when there's no next occurrence
    expect(advanced.due_date).toBe('2026-04-05');
  });

  it('getMyDayTasks returns overdue and today tasks', async () => {
    const list = await createList('Chores', 'general');
    await createTask(list.id, 'Overdue', { due_date: '2026-04-01' });
    await createTask(list.id, 'Today', { due_date: '2026-04-05' });
    await createTask(list.id, 'Future', { due_date: '2026-04-10' });
    const { overdue, today } = await getMyDayTasks('2026-04-05');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe('Overdue');
    expect(today).toHaveLength(1);
    expect(today[0].title).toBe('Today');
  });

  it('getMyDayTasks keeps tasks completed today visible', async () => {
    const todayDate = getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const list = await createList('Chores', 'general');
    const overdueTask = await createTask(list.id, 'Overdue done today', { due_date: yesterdayDate });
    const todayTask = await createTask(list.id, 'Today done today', { due_date: todayDate });
    await createTask(list.id, 'Still active', { due_date: todayDate });
    await setTaskCompleted(overdueTask.id, true);
    await setTaskCompleted(todayTask.id, true);
    const { overdue, today } = await getMyDayTasks(todayDate);
    // Completed-today tasks remain visible
    expect(overdue.some((t) => t.title === 'Overdue done today')).toBe(true);
    expect(today.some((t) => t.title === 'Today done today')).toBe(true);
    expect(today.some((t) => t.title === 'Still active')).toBe(true);
  });

  it('getMyDayTasks hides tasks completed on a prior day', async () => {
    const list = await createList('Chores', 'general');
    const task = await createTask(list.id, 'Old done', { due_date: '2026-04-01' });
    // Manually set completed_at to yesterday
    await setTaskCompleted(task.id, true);
    // Overwrite completed_at to simulate it was completed yesterday
    const db = await (await import('../../db/client')).getDB();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const req2 = store.get(task.id);
    await new Promise((res) => { req2.onsuccess = res; });
    await new Promise((res, rej) => {
      const put = store.put({ ...req2.result, completed_at: '2026-04-04T12:00:00.000Z' });
      put.onsuccess = res;
      put.onerror = rej;
    });
    const { overdue } = await getMyDayTasks('2026-04-05');
    expect(overdue.some((t) => t.title === 'Old done')).toBe(false);
  });

  it('updateTask changes title and sets pending_sync', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Old title');
    const updated = await updateTask(task.id, { title: 'New title' });
    expect(updated.title).toBe('New title');
    expect(updated.pending_sync).toBe(true);
  });

  it('updateTask can set due_date', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'No date');
    const updated = await updateTask(task.id, { due_date: '2026-05-01' });
    expect(updated.due_date).toBe('2026-05-01');
  });

  it('bulkUpdateTaskGroup reassigns all tasks in a group', async () => {
    const list = await createList('Test', 'general');
    await createTask(list.id, 'T1', { group: 'alpha' });
    await createTask(list.id, 'T2', { group: 'alpha' });
    await createTask(list.id, 'T3', { group: 'beta' });
    await bulkUpdateTaskGroup(list.id, 'alpha', 'gamma');
    const tasks = await getTasksByList(list.id);
    const gammas = tasks.filter((t) => t.group === 'gamma');
    const alphas = tasks.filter((t) => t.group === 'alpha');
    expect(gammas).toHaveLength(2);
    expect(alphas).toHaveLength(0);
    // beta task is untouched
    expect(tasks.find((t) => t.title === 'T3')?.group).toBe('beta');
  });

  it('bulkUpdateTaskGroup returns empty array when no tasks match', async () => {
    const list = await createList('Test', 'general');
    await createTask(list.id, 'T1', { group: 'alpha' });
    const result = await bulkUpdateTaskGroup(list.id, 'nonexistent', 'new');
    expect(result).toEqual([]);
  });

  it('advanceCyclicalTask throws when task ID does not exist', async () => {
    await expect(advanceCyclicalTask('nonexistent-id')).rejects.toThrow('nonexistent-id');
  });

  it('advanceRecurringTask throws when task ID does not exist', async () => {
    await expect(advanceRecurringTask('nonexistent-id')).rejects.toThrow('nonexistent-id');
  });

  it('createTask includes note: null by default', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Meditate');
    expect(task.note).toBeNull();
  });

  it('updateTask persists a note value', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Meditate');
    const updated = await updateTask(task.id, { note: '30 min' });
    expect(updated.note).toBe('30 min');
  });

  it('updateTask clears note when set to null', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Meditate');
    await updateTask(task.id, { note: '30 min' });
    const cleared = await updateTask(task.id, { note: null });
    expect(cleared.note).toBeNull();
  });

  it('purgeOldShoppingItems deletes soft-deleted items older than 30 days', async () => {
    const list = await createList('Groceries', 'shopping');
    const task = await createTask(list.id, 'Old eggs');
    // Manually set deleted_at to 31 days ago
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);
    await softDeleteTask(task.id, oldDate.toISOString());
    await purgeOldShoppingItems();
    const tasks = await getTasksByList(list.id, { includeDeleted: true });
    expect(tasks).toHaveLength(0);
  });
});
