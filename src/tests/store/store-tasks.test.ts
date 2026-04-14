import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/index';
import { createList as dbCreateList } from '../../db/lists';
import { createTask as dbCreateTask } from '../../db/tasks';
import { getTasksByList } from '../../db/tasks';
import { getTodayString } from '../../utils/date';

beforeEach(() => {
  useAppStore.getState().reset();
});

describe('store: addTask', () => {
  it('adds a task to tasksByList in the store', async () => {
    const list = await dbCreateList('Inbox', 'general');
    const task = await useAppStore.getState().addTask(list.id, 'Buy oat milk');
    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)).toBeDefined();
    expect(task.title).toBe('Buy oat milk');
  });

  it('adds task with a group', async () => {
    const list = await dbCreateList('Inbox', 'general');
    const task = await useAppStore.getState().addTask(list.id, 'Meeting', 'Work');
    expect(task.group).toBe('Work');
  });

  it('persists the task in the DB', async () => {
    const list = await dbCreateList('Inbox', 'general');
    const task = await useAppStore.getState().addTask(list.id, 'Groceries');
    const dbTasks = await getTasksByList(list.id);
    expect(dbTasks.find((t) => t.id === task.id)).toBeDefined();
  });
});

describe('store: addTask with due_date', () => {
  it('sets due_date on the created task', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const today = getTodayString();
    const task = await useAppStore.getState().addTask(list.id, 'Quick task', null, today);
    expect(task.due_date).toBe(today);
  });

  it('adds task to myDayToday when due_date is today', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const today = getTodayString();
    const task = await useAppStore.getState().addTask(list.id, 'Quick task', null, today);
    expect(useAppStore.getState().myDayToday.find((t) => t.id === task.id)).toBeDefined();
  });

  it('does not add to myDayToday when due_date is a future date', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await useAppStore.getState().addTask(list.id, 'Future task', null, '2099-01-01');
    expect(useAppStore.getState().myDayToday.find((t) => t.id === task.id)).toBeUndefined();
  });

  it('does not add to myDayToday when due_date is omitted', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await useAppStore.getState().addTask(list.id, 'No date task');
    expect(useAppStore.getState().myDayToday.find((t) => t.id === task.id)).toBeUndefined();
  });
});

describe('store: renameTask', () => {
  it('updates the task title in the store', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Old title');
    await useAppStore.getState().loadTasks(list.id);

    const updated = await useAppStore.getState().renameTask(task.id, list.id, 'New title');

    expect(updated.title).toBe('New title');
    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.title).toBe('New title');
  });
});

describe('store: updateTaskFields', () => {
  it('updates due_date in the store', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Do taxes');
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().updateTaskFields(task.id, list.id, { due_date: '2026-05-01' });

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.due_date).toBe('2026-05-01');
  });

  it('updates rrule in the store', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Weekly review', { due_date: '2026-04-10' });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().updateTaskFields(task.id, list.id, { rrule: 'FREQ=WEEKLY;INTERVAL=1' });

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.rrule).toBe('FREQ=WEEKLY;INTERVAL=1');
  });
});

describe('store: moveTaskToGroup', () => {
  it('assigns a task to a group', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Plan sprint');
    await useAppStore.getState().loadTasks(list.id);

    const updated = await useAppStore.getState().moveTaskToGroup(task.id, list.id, 'Work');

    expect(updated.group).toBe('Work');
    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.group).toBe('Work');
  });

  it('removes a task from a group when null is passed', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Plan sprint', { group: 'Work' });
    await useAppStore.getState().loadTasks(list.id);

    const updated = await useAppStore.getState().moveTaskToGroup(task.id, list.id, null);

    expect(updated.group).toBeNull();
  });
});

describe('store: renameGroup', () => {
  it('renames all tasks in a group in the store', async () => {
    const list = await dbCreateList('Tasks', 'general');
    await dbCreateTask(list.id, 'T1', { group: 'alpha' });
    await dbCreateTask(list.id, 'T2', { group: 'alpha' });
    await dbCreateTask(list.id, 'T3', { group: 'beta' });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().renameGroup(list.id, 'alpha', 'gamma');

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.filter((t) => t.group === 'gamma')).toHaveLength(2);
    expect(tasks.filter((t) => t.group === 'alpha')).toHaveLength(0);
    expect(tasks.find((t) => t.title === 'T3')?.group).toBe('beta');
  });
});

describe('store: deleteGroup', () => {
  it('sets group to null for all tasks in the group', async () => {
    const list = await dbCreateList('Tasks', 'general');
    await dbCreateTask(list.id, 'T1', { group: 'alpha' });
    await dbCreateTask(list.id, 'T2', { group: 'alpha' });
    await dbCreateTask(list.id, 'T3', { group: 'beta' });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().deleteGroup(list.id, 'alpha');

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.filter((t) => t.group === null && (t.title === 'T1' || t.title === 'T2'))).toHaveLength(2);
    expect(tasks.find((t) => t.title === 'T3')?.group).toBe('beta');
  });
});

describe('store: removeTask', () => {
  it('removes the task from tasksByList in the store', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Temp task');
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().removeTask(task.id, list.id);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)).toBeUndefined();
  });

  it('soft-deletes the task in the DB (excluded from normal queries)', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Temp task');
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().removeTask(task.id, list.id);

    const dbTasks = await getTasksByList(list.id);
    expect(dbTasks.find((t) => t.id === task.id)).toBeUndefined();
  });

  it('removes the task from myDayOverdue if present', async () => {
    const list = await dbCreateList('Tasks', 'general');
    const task = await dbCreateTask(list.id, 'Overdue task', { due_date: '2026-04-01' });
    await useAppStore.getState().loadMyDay();

    await useAppStore.getState().removeTask(task.id, list.id);

    expect(useAppStore.getState().myDayOverdue.find((t) => t.id === task.id)).toBeUndefined();
  });
});

describe('store: completeTask without list loaded', () => {
  it('does not create an empty tasksByList entry when list was never loaded', async () => {
    const list = await dbCreateList('Work', 'general');
    const task = await dbCreateTask(list.id, 'Finish report', { due_date: '2026-04-08' });

    // Simulate completing from My Day without ever loading the list
    await useAppStore.getState().loadMyDay();
    expect(useAppStore.getState().tasksByList[list.id]).toBeUndefined();

    await useAppStore.getState().completeTask(task.id, list.id, true);

    // tasksByList[listId] must stay undefined so ListView triggers loadTasks on mount
    expect(useAppStore.getState().tasksByList[list.id]).toBeUndefined();
  });

  it('still persists the completion to the DB', async () => {
    const list = await dbCreateList('Work', 'general');
    const task = await dbCreateTask(list.id, 'Finish report', { due_date: '2026-04-08' });

    await useAppStore.getState().loadMyDay();
    await useAppStore.getState().completeTask(task.id, list.id, true);

    const dbTasks = await getTasksByList(list.id);
    expect(dbTasks.find((t) => t.id === task.id)?.completed).toBe(true);
  });
});

describe('store: removeTask without list loaded', () => {
  it('does not create an empty tasksByList entry when list was never loaded', async () => {
    const list = await dbCreateList('Work', 'general');
    const task = await dbCreateTask(list.id, 'Finish report', { due_date: '2026-04-08' });

    await useAppStore.getState().loadMyDay();
    expect(useAppStore.getState().tasksByList[list.id]).toBeUndefined();

    await useAppStore.getState().removeTask(task.id, list.id);

    expect(useAppStore.getState().tasksByList[list.id]).toBeUndefined();
  });
});

describe('store: loadTasks', () => {
  it('loads tasks for a list including soft-deleted', async () => {
    const list = await dbCreateList('Test', 'general');
    await dbCreateTask(list.id, 'Active');
    const deleted = await dbCreateTask(list.id, 'Deleted');
    // soft-delete via store removeTask
    const { softDeleteTask } = await import('../../db/tasks');
    await softDeleteTask(deleted.id);

    await useAppStore.getState().loadTasks(list.id);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    // includeDeleted: true — both should be present
    expect(tasks).toHaveLength(2);
  });
});
