import { getDB } from './client';
function req(r) {
    return new Promise((res, rej) => {
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}
export async function getCompletionsForTask(taskId) {
    const db = await getDB();
    return req(db.transaction('habit_completions').objectStore('habit_completions').index('task_id').getAll(taskId));
}
export async function getTodayCompletions(date) {
    const db = await getDB();
    const all = await req(db.transaction('habit_completions').objectStore('habit_completions').index('date').getAll(date));
    return all.filter((c) => c.deleted_at === null);
}
/**
 * Toggle a habit completion for a given date.
 * Returns 'added' or 'removed'.
 */
export async function toggleHabitCompletion(taskId, date) {
    const db = await getDB();
    const tx = db.transaction('habit_completions', 'readwrite');
    const store = tx.objectStore('habit_completions');
    // Check if a completion exists for this task+date
    const existing = await req(store.index('task_id_date').get([taskId, date]));
    if (existing && existing.deleted_at === null) {
        // Soft-delete
        await req(store.put({
            ...existing,
            deleted_at: new Date().toISOString(),
            pending_sync: true,
        }));
        return 'removed';
    }
    if (existing && existing.deleted_at !== null) {
        // Restore
        await req(store.put({
            ...existing,
            deleted_at: null,
            pending_sync: true,
        }));
        return 'added';
    }
    // Create new
    const completion = {
        id: crypto.randomUUID(),
        task_id: taskId,
        date,
        created_at: new Date().toISOString(),
        deleted_at: null,
        pending_sync: true,
    };
    await req(store.add(completion));
    return 'added';
}
/**
 * Calculate the current streak for a task given its completions.
 * Pure function — accepts today as a parameter so it's testable.
 */
export function calculateStreak(completions, taskId, today) {
    const activeDates = new Set(completions
        .filter((c) => c.task_id === taskId && c.deleted_at === null)
        .map((c) => c.date));
    let streak = 0;
    const base = new Date(today + 'T00:00:00');
    for (let i = 0; i < 365; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const dateStr = [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, '0'),
            String(d.getDate()).padStart(2, '0'),
        ].join('-');
        if (activeDates.has(dateStr)) {
            streak++;
        }
        else {
            break;
        }
    }
    return streak;
}
