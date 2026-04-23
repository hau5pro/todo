import { getDB, req, excludeDeleted } from './client';
import { requestSync } from '../sync/orchestrator';
import type { HabitSession } from '../types';

export async function startSession(taskId: string, date: string): Promise<HabitSession> {
  const db = await getDB();
  const now = new Date().toISOString();
  const session: HabitSession = {
    id: crypto.randomUUID(),
    task_id: taskId,
    date,
    started_at: now,
    ended_at: null,
    deleted_at: null,
    updated_at: now,
    pending_sync: true,
  };
  await req(db.transaction('habit_sessions', 'readwrite').objectStore('habit_sessions').add(session));
  requestSync();
  return session;
}

export async function stopSession(sessionId: string): Promise<HabitSession> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  const now = new Date().toISOString();
  const updated: HabitSession = { ...existing, ended_at: now, updated_at: now, pending_sync: true };
  await req(store.put(updated));
  requestSync();
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
  const now = new Date().toISOString();
  const updated: HabitSession = {
    ...existing,
    started_at: startedAt,
    ended_at: endedAt,
    updated_at: now,
    pending_sync: true,
  };
  await req(store.put(updated));
  requestSync();
  return updated;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('habit_sessions', 'readwrite');
  const store = tx.objectStore('habit_sessions');
  const existing = await req<HabitSession | undefined>(store.get(sessionId));
  if (!existing) throw new Error(`Session not found: ${sessionId}`);
  const now = new Date().toISOString();
  await req(store.put({ ...existing, deleted_at: now, updated_at: now, pending_sync: true }));
  requestSync();
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
