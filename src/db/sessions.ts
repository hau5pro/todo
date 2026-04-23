import { getDB, req, excludeDeleted } from './client';
import type { HabitSession } from '../types';

export async function startSession(taskId: string, date: string): Promise<HabitSession> {
  const db = await getDB();
  const session: HabitSession = {
    id: crypto.randomUUID(),
    task_id: taskId,
    date,
    started_at: new Date().toISOString(),
    ended_at: null,
    deleted_at: null,
    pending_sync: true,
  };
  await req(db.transaction('habit_sessions', 'readwrite').objectStore('habit_sessions').add(session));
  return session;
}

export async function stopSession(sessionId: string): Promise<HabitSession> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  const updated: HabitSession = { ...existing, ended_at: new Date().toISOString(), pending_sync: true };
  await req(store.put(updated));
  return updated;
}

export async function updateSession(
  sessionId: string,
  startedAt: string,
  endedAt: string,
): Promise<HabitSession> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  const updated: HabitSession = { ...existing, started_at: startedAt, ended_at: endedAt, pending_sync: true };
  await req(store.put(updated));
  return updated;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  await req(store.put({ ...existing, deleted_at: new Date().toISOString(), pending_sync: true }));
}

export async function getSessionsForTaskDate(taskId: string, date: string): Promise<HabitSession[]> {
  const db = await getDB();
  const all = await req<HabitSession[]>(
    db
      .transaction('habit_sessions')
      .objectStore('habit_sessions')
      .index('task_id_date')
      .getAll([taskId, date]),
  );
  return excludeDeleted(all).sort((a, b) => a.started_at.localeCompare(b.started_at));
}

export async function getActiveSessionsForDate(date: string): Promise<HabitSession[]> {
  const db = await getDB();
  const all = await req<HabitSession[]>(
    db.transaction('habit_sessions').objectStore('habit_sessions').index('date').getAll(date),
  );
  return all.filter((s) => s.ended_at === null && s.deleted_at === null);
}
