import { describe, it, expect } from 'vitest';
import {
  createTask, getTasksByList, setTaskCompleted,
  advanceCyclicalTask, softDeleteTask, getMyDayTasks, purgeOldShoppingItems,
} from '../../db/tasks';
import { createList } from '../../db/lists';

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

  it('setTaskCompleted toggles completion', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Foo');
    const updated = await setTaskCompleted(task.id, true);
    expect(updated.completed).toBe(true);
  });

  it('softDeleteTask excludes task from getTasksByList', async () => {
    const list = await createList('Test', 'shopping');
    const task = await createTask(list.id, 'Eggs');
    await softDeleteTask(task.id);
    const tasks = await getTasksByList(list.id);
    expect(tasks).toHaveLength(0);
  });

  it('advanceCyclicalTask advances due_date by days', async () => {
    const list = await createList('Chores', 'cyclical');
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
    const list = await createList('Chores', 'cyclical');
    const task = await createTask(list.id, 'Clean', {
      due_date: '2026-04-05',
      recurrence_interval: 2,
      recurrence_unit: 'weeks',
    });
    const advanced = await advanceCyclicalTask(task.id);
    expect(advanced.due_date).toBe('2026-04-19');
  });

  it('advanceCyclicalTask advances due_date by months', async () => {
    const list = await createList('Chores', 'cyclical');
    const task = await createTask(list.id, 'Check', {
      due_date: '2026-04-05',
      recurrence_interval: 1,
      recurrence_unit: 'months',
    });
    const advanced = await advanceCyclicalTask(task.id);
    expect(advanced.due_date).toBe('2026-05-05');
  });

  it('getMyDayTasks returns overdue and today tasks', async () => {
    const list = await createList('Chores', 'cyclical');
    await createTask(list.id, 'Overdue', { due_date: '2026-04-01' });
    await createTask(list.id, 'Today', { due_date: '2026-04-05' });
    await createTask(list.id, 'Future', { due_date: '2026-04-10' });
    const { overdue, today } = await getMyDayTasks('2026-04-05');
    expect(overdue).toHaveLength(1);
    expect(overdue[0].title).toBe('Overdue');
    expect(today).toHaveLength(1);
    expect(today[0].title).toBe('Today');
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
