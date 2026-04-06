import { getDB } from './client';
function req(r) {
    return new Promise((res, rej) => {
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}
function advanceDueDate(dueDate, interval, unit) {
    // Parse as local date to avoid timezone issues
    const [y, m, d] = dueDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (unit === 'days')
        date.setDate(date.getDate() + interval);
    if (unit === 'weeks')
        date.setDate(date.getDate() + interval * 7);
    if (unit === 'months')
        date.setMonth(date.getMonth() + interval);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
    ].join('-');
}
export async function createTask(listId, title, opts = {}) {
    const task = {
        id: crypto.randomUUID(),
        list_id: listId,
        title,
        completed: false,
        due_date: opts.due_date ?? null,
        recurrence_interval: opts.recurrence_interval ?? null,
        recurrence_unit: opts.recurrence_unit ?? null,
        updated_at: new Date().toISOString(),
        deleted_at: null,
        pending_sync: true,
    };
    const db = await getDB();
    await req(db.transaction('tasks', 'readwrite').objectStore('tasks').add(task));
    return task;
}
export async function getTasksByList(listId, opts = {}) {
    const db = await getDB();
    const all = await req(db.transaction('tasks').objectStore('tasks').index('list_id').getAll(listId));
    return opts.includeDeleted ? all : all.filter((t) => t.deleted_at === null);
}
export async function setTaskCompleted(id, completed) {
    const db = await getDB();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const existing = await req(store.get(id));
    const updated = {
        ...existing,
        completed,
        updated_at: new Date().toISOString(),
        pending_sync: true,
    };
    await req(store.put(updated));
    return updated;
}
export async function advanceCyclicalTask(id) {
    const db = await getDB();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const existing = await req(store.get(id));
    if (!existing.due_date || !existing.recurrence_interval || !existing.recurrence_unit) {
        throw new Error(`Task ${id} is not a cyclical task`);
    }
    const updated = {
        ...existing,
        due_date: advanceDueDate(existing.due_date, existing.recurrence_interval, existing.recurrence_unit),
        completed: false,
        updated_at: new Date().toISOString(),
        pending_sync: true,
    };
    await req(store.put(updated));
    return updated;
}
export async function softDeleteTask(id, deletedAt) {
    const db = await getDB();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const existing = await req(store.get(id));
    await req(store.put({
        ...existing,
        deleted_at: deletedAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pending_sync: true,
    }));
}
export async function updateTask(id, changes) {
    const db = await getDB();
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    const existing = await req(store.get(id));
    const updated = {
        ...existing,
        ...changes,
        updated_at: new Date().toISOString(),
        pending_sync: true,
    };
    await req(store.put(updated));
    return updated;
}
/** Returns overdue and today tasks across all lists (excludes daily/template lists). */
export async function getMyDayTasks(today) {
    const db = await getDB();
    const all = await req(db.transaction('tasks').objectStore('tasks').getAll());
    const active = all.filter((t) => t.due_date !== null && t.completed === false && t.deleted_at === null);
    return {
        overdue: active.filter((t) => t.due_date < today),
        today: active.filter((t) => t.due_date === today),
    };
}
/** Hard-deletes shopping items soft-deleted more than 30 days ago. */
export async function purgeOldShoppingItems() {
    const db = await getDB();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString();
    const all = await req(db.transaction('tasks').objectStore('tasks').getAll());
    const toDelete = all.filter((t) => t.deleted_at !== null && t.deleted_at < cutoffStr);
    if (toDelete.length === 0)
        return;
    const tx = db.transaction('tasks', 'readwrite');
    const store = tx.objectStore('tasks');
    await Promise.all(toDelete.map((t) => req(store.delete(t.id))));
}
