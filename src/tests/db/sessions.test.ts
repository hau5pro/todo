import { describe, it, expect } from 'vitest';
import {
  startSession,
  stopSession,
  updateSession,
  deleteSession,
  getSessionsForTaskDate,
  getActiveSessionsForDate,
} from '../../db/sessions';
import { createList } from '../../db/lists';
import { createTask } from '../../db/tasks';

describe('startSession', () => {
  it('creates a session with ended_at null', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Meditate');
    const session = await startSession(task.id, '2026-04-23');
    expect(session.task_id).toBe(task.id);
    expect(session.date).toBe('2026-04-23');
    expect(session.ended_at).toBeNull();
    expect(session.deleted_at).toBeNull();
    expect(session.pending_sync).toBe(true);
  });
});

describe('stopSession', () => {
  it('fills in ended_at', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Exercise');
    const session = await startSession(task.id, '2026-04-23');
    const stopped = await stopSession(session.id);
    expect(stopped.id).toBe(session.id);
    expect(stopped.ended_at).not.toBeNull();
    expect(typeof stopped.ended_at).toBe('string');
  });
});

describe('updateSession', () => {
  it('overwrites both timestamps', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Read');
    const session = await startSession(task.id, '2026-04-23');
    const stopped = await stopSession(session.id);
    const newStart = '2026-04-23T08:00:00.000Z';
    const newEnd = '2026-04-23T08:30:00.000Z';
    const updated = await updateSession(stopped.id, newStart, newEnd);
    expect(updated.started_at).toBe(newStart);
    expect(updated.ended_at).toBe(newEnd);
  });
});

describe('deleteSession', () => {
  it('soft-deletes by setting deleted_at', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Yoga');
    const session = await startSession(task.id, '2026-04-23');
    await stopSession(session.id);
    await deleteSession(session.id);
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(0);
  });
});

describe('getSessionsForTaskDate', () => {
  it('returns sessions for the given task and date', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Journal');
    await startSession(task.id, '2026-04-23').then(s => stopSession(s.id));
    await startSession(task.id, '2026-04-23').then(s => stopSession(s.id));
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(2);
    expect(sessions.every(s => s.task_id === task.id)).toBe(true);
    expect(sessions.every(s => s.date === '2026-04-23')).toBe(true);
  });

  it('excludes sessions for other dates', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Stretch');
    await startSession(task.id, '2026-04-22').then(s => stopSession(s.id));
    await startSession(task.id, '2026-04-23').then(s => stopSession(s.id));
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(1);
  });

  it('excludes soft-deleted sessions', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Walk');
    const s = await startSession(task.id, '2026-04-23');
    await stopSession(s.id);
    await deleteSession(s.id);
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions).toHaveLength(0);
  });

  it('returns sessions sorted by started_at ascending', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Run');
    const s1 = await startSession(task.id, '2026-04-23');
    await new Promise(r => setTimeout(r, 5));
    const s2 = await startSession(task.id, '2026-04-23');
    await stopSession(s1.id);
    await stopSession(s2.id);
    const sessions = await getSessionsForTaskDate(task.id, '2026-04-23');
    expect(sessions[0].id).toBe(s1.id);
    expect(sessions[1].id).toBe(s2.id);
  });
});

describe('getActiveSessionsForDate', () => {
  it('returns only sessions with ended_at null', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Meditate');
    const active = await startSession(task.id, '2026-04-23');
    const finished = await startSession(task.id, '2026-04-23');
    await stopSession(finished.id);
    const result = await getActiveSessionsForDate('2026-04-23');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(active.id);
  });

  it('excludes soft-deleted active sessions', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Read');
    const s = await startSession(task.id, '2026-04-23');
    await deleteSession(s.id);
    const result = await getActiveSessionsForDate('2026-04-23');
    expect(result).toHaveLength(0);
  });

  it('excludes active sessions from other dates', async () => {
    const list = await createList('Habits', 'daily');
    const task = await createTask(list.id, 'Exercise');
    await startSession(task.id, '2026-04-22');
    const result = await getActiveSessionsForDate('2026-04-23');
    expect(result).toHaveLength(0);
  });
});
