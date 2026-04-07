import { RRule } from 'rrule';
import { getDB } from './client';
import type { Task, RecurrenceUnit } from '../types';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function advanceDueDate(dueDate: string, interval: number, unit: RecurrenceUnit): string {
  // Parse as local date to avoid timezone issues
  const [y, m, d] = dueDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (unit === 'days') date.setDate(date.getDate() + interval);
  if (unit === 'weeks') date.setDate(date.getDate() + interval * 7);
  if (unit === 'months') date.setMonth(date.getMonth() + interval);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function nextOccurrenceFromRRule(currentDueDate: string, rruleStr: string): string | null {
  const [y, m, d] = currentDueDate.split('-').map(Number);
  const current = new Date(Date.UTC(y, m - 1, d));
  // Set dtstart to current due date midnight UTC so occurrences are anchored
  // to day boundaries — without this, rrule defaults to new Date() (current
  // clock time) which can cause rule.after(current) to return the same day.
  const rule = new RRule({ ...RRule.parseString(rruleStr), dtstart: current });
  const next = rule.after(current, false);
  if (!next) return null;
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

type CreateTaskOpts = Partial<Pick<Task, 'due_date' | 'recurrence_interval' | 'recurrence_unit' | 'rrule' | 'completed' | 'group'>>;

export async function createTask(listId: string, title: string, opts: CreateTaskOpts = {}): Promise<Task> {
  const task: Task = {
    id: crypto.randomUUID(),
    list_id: listId,
    title,
    completed: opts.completed ?? false,
    due_date: opts.due_date ?? null,
    recurrence_interval: opts.recurrence_interval ?? null,
    recurrence_unit: opts.recurrence_unit ?? null,
    rrule: opts.rrule ?? null,
    group: opts.group ?? null,
    updated_at: new Date().toISOString(),
    deleted_at: null,
    pending_sync: true,
  };
  const db = await getDB();
  await req(db.transaction('tasks', 'readwrite').objectStore('tasks').add(task));
  return task;
}

type GetTasksOpts = { includeDeleted?: boolean };

export async function getTasksByList(listId: string, opts: GetTasksOpts = {}): Promise<Task[]> {
  const db = await getDB();
  const all = await req<Task[]>(
    db.transaction('tasks').objectStore('tasks').index('list_id').getAll(listId)
  );
  return opts.includeDeleted ? all : all.filter((t) => t.deleted_at === null);
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<Task> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const existing = await req<Task>(store.get(id));
  const updated: Task = {
    ...existing,
    completed,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
  await req(store.put(updated));
  return updated;
}

export async function advanceCyclicalTask(id: string): Promise<Task> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const existing = await req<Task>(store.get(id));
  if (!existing.due_date || !existing.recurrence_interval || !existing.recurrence_unit) {
    throw new Error(`Task ${id} has no recurrence configured`);
  }
  const updated: Task = {
    ...existing,
    due_date: advanceDueDate(existing.due_date, existing.recurrence_interval, existing.recurrence_unit),
    completed: false,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
  await req(store.put(updated));
  return updated;
}


export async function softDeleteTask(id: string, deletedAt?: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const existing = await req<Task>(store.get(id));
  await req(
    store.put({
      ...existing,
      deleted_at: deletedAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: true,
    })
  );
}

export async function advanceRecurringTask(id: string): Promise<Task> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const existing = await req<Task>(store.get(id));
  if (!existing.due_date || !existing.rrule) {
    throw new Error(`Task ${id} does not have rrule recurrence`);
  }
  const nextDate = nextOccurrenceFromRRule(existing.due_date, existing.rrule);
  const updated: Task = {
    ...existing,
    due_date: nextDate ?? existing.due_date,
    completed: nextDate ? false : true,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
  await req(store.put(updated));
  return updated;
}

/** Bulk-update group field for all tasks in a list with a matching group value. */
export async function bulkUpdateTaskGroup(listId: string, oldGroup: string | null, newGroup: string | null): Promise<Task[]> {
  const db = await getDB();
  const all = await req<Task[]>(
    db.transaction('tasks').objectStore('tasks').index('list_id').getAll(listId)
  );
  const toUpdate = all.filter((t) => t.group === oldGroup && t.deleted_at === null);
  if (toUpdate.length === 0) return [];
  const now = new Date().toISOString();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const updated = toUpdate.map((t) => ({ ...t, group: newGroup, updated_at: now, pending_sync: true }));
  await Promise.all(updated.map((t) => req(store.put(t))));
  return updated;
}

export async function updateTask(id: string, changes: Partial<Pick<Task, 'title' | 'due_date' | 'recurrence_interval' | 'recurrence_unit' | 'rrule' | 'group'>>): Promise<Task> {
  const db = await getDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const existing = await req<Task>(store.get(id));
  const updated: Task = {
    ...existing,
    ...changes,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
  await req(store.put(updated));
  return updated;
}

/** Returns overdue and today tasks across all lists. Habit tasks (daily lists) are excluded implicitly — they never have a due_date. */
export async function getMyDayTasks(today: string): Promise<{ overdue: Task[]; today: Task[] }> {
  const db = await getDB();
  const all = await req<Task[]>(db.transaction('tasks').objectStore('tasks').getAll());
  const active = all.filter(
    (t) => t.due_date !== null && t.completed === false && t.deleted_at === null
  );
  return {
    overdue: active.filter((t) => t.due_date! < today),
    today: active.filter((t) => t.due_date! === today),
  };
}

/** Hard-deletes shopping items soft-deleted more than 30 days ago. */
export async function purgeOldShoppingItems(): Promise<void> {
  const db = await getDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();

  const all = await req<Task[]>(db.transaction('tasks').objectStore('tasks').getAll());
  const toDelete = all.filter(
    (t) => t.deleted_at !== null && t.deleted_at < cutoffStr
  );

  if (toDelete.length === 0) return;

  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  await Promise.all(toDelete.map((t) => req(store.delete(t.id))));
}
