// src/tests/db/sync.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pushPending, pullFromSupabase, initialSync } from '../../db/sync';
import { createList, getLists } from '../../db/lists';
import { createTask, getTasksByList } from '../../db/tasks';
import { getDB } from '../../db/client';

function makeMockSupabase(upsertData: unknown[] = []) {
  const upsertMock = vi.fn().mockResolvedValue({ error: null, data: upsertData });
  const selectMock = vi.fn().mockReturnValue({
    gt: vi.fn().mockResolvedValue({ data: [], error: null }),
  });
  return {
    from: vi.fn().mockReturnValue({
      upsert: upsertMock,
      select: selectMock,
    }),
    _upsertMock: upsertMock,
  };
}

/**
 * Build a mock Supabase whose select().gt() chain returns per-table data.
 * tableDataMap: { [tableName]: rowArray }
 */
function makePullMockSupabase(tableDataMap: Record<string, unknown[]> = {}) {
  const gtSpies: Record<string, ReturnType<typeof vi.fn>> = {};

  const fromMock = vi.fn().mockImplementation((table: string) => {
    const gtSpy = vi.fn().mockResolvedValue({
      data: tableDataMap[table] ?? [],
      error: null,
    });
    gtSpies[table] = gtSpy;
    return {
      select: vi.fn().mockReturnValue({ gt: gtSpy }),
      upsert: vi.fn().mockResolvedValue({ error: null, data: [] }),
    };
  });

  return { from: fromMock, _gtSpies: gtSpies };
}

describe('pushPending', () => {
  // IDB state is automatically reset before each test by the global beforeEach in
  // src/tests/setup.ts, which replaces indexedDB with a fresh IDBFactory instance
  // and calls _resetForTesting(). No explicit cleanup is needed here.

  it('upserts pending lists to Supabase', async () => {
    const list = await createList('Groceries', 'shopping');
    const mockSupa = makeMockSupabase();
    await pushPending(await getDB(), mockSupa as never, 'user-123');
    expect(mockSupa.from).toHaveBeenCalledWith('lists');
    expect(mockSupa._upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: list.id, user_id: 'user-123' })]),
      expect.any(Object)
    );
  });

  it('clears pending_sync on lists after successful upsert', async () => {
    await createList('Groceries', 'shopping');
    const mockSupa = makeMockSupabase();
    await pushPending(await getDB(), mockSupa as never, 'user-123');
    const lists = await getLists();
    expect(lists.every((l) => l.pending_sync === false)).toBe(true);
  });

  it('upserts pending tasks to Supabase', async () => {
    const list = await createList('Test', 'general');
    const task = await createTask(list.id, 'Buy milk');
    const mockSupa = makeMockSupabase();
    await pushPending(await getDB(), mockSupa as never, 'user-123');
    expect(mockSupa.from).toHaveBeenCalledWith('tasks');
    expect(mockSupa._upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: task.id, user_id: 'user-123' })]),
      expect.any(Object)
    );
  });

  it('clears pending_sync on tasks after successful upsert', async () => {
    const list = await createList('Test', 'general');
    await createTask(list.id, 'Buy milk');
    const mockSupa = makeMockSupabase();
    await pushPending(await getDB(), mockSupa as never, 'user-123');
    const tasks = await getTasksByList(list.id);
    expect(tasks.every((t) => t.pending_sync === false)).toBe(true);
  });

  it('does not upsert when no pending records', async () => {
    const mockSupa = makeMockSupabase();
    await pushPending(await getDB(), mockSupa as never, 'user-123');
    expect(mockSupa._upsertMock).not.toHaveBeenCalled();
  });
});

describe('pullFromSupabase', () => {
  const LAST_SYNC_KEY = 'todo_last_sync';

  beforeEach(() => {
    localStorage.removeItem(LAST_SYNC_KEY);
  });

  it('merges remote records into IDB with pending_sync: false and without user_id', async () => {
    const remoteList = {
      id: 'remote-list-1',
      name: 'Remote List',
      type: 'general',
      updated_at: '2026-01-01T00:00:00Z',
      deleted_at: null,
      user_id: 'user-abc',
    };
    const mockSupa = makePullMockSupabase({ lists: [remoteList] });
    const db = await getDB();

    await pullFromSupabase(db, mockSupa as never);

    // Record should be in IDB
    const lists = await getLists();
    const stored = lists.find((l) => l.id === 'remote-list-1');
    expect(stored).toBeDefined();
    expect(stored!.pending_sync).toBe(false);
    expect((stored as unknown as Record<string, unknown>).user_id).toBeUndefined();
  });

  it('does NOT overwrite a local record that is newer (last-write-wins)', async () => {
    // Create a local list with a newer updated_at
    const local = await createList('Local Newer', 'general');
    // Simulate local being already-synced (pending_sync: false) with a recent timestamp
    const db = await getDB();
    const tx = db.transaction('lists', 'readwrite');
    const store = tx.objectStore('lists');
    const newerTime = '2030-01-01T00:00:00Z';
    await new Promise<void>((res, rej) => {
      const r = store.put({ ...local, updated_at: newerTime, pending_sync: false });
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });

    // Remote record has an older updated_at
    const remoteList = {
      id: local.id,
      name: 'Remote Older',
      type: 'general',
      updated_at: '2020-01-01T00:00:00Z',
      deleted_at: null,
      user_id: 'user-abc',
    };
    const mockSupa = makePullMockSupabase({ lists: [remoteList] });

    await pullFromSupabase(db, mockSupa as never);

    const lists = await getLists();
    const stored = lists.find((l) => l.id === local.id);
    // Local newer name should be preserved
    expect(stored!.name).toBe('Local Newer');
  });

  it('updates todo_last_sync in localStorage after pulling', async () => {
    const before = Date.now();
    const mockSupa = makePullMockSupabase({});
    const db = await getDB();

    await pullFromSupabase(db, mockSupa as never);

    const stored = localStorage.getItem(LAST_SYNC_KEY);
    expect(stored).not.toBeNull();
    const storedTime = new Date(stored!).getTime();
    expect(storedTime).toBeGreaterThanOrEqual(before);
  });

  it('uses created_at filter for habit_completions and updated_at for lists/tasks', async () => {
    const mockSupa = makePullMockSupabase({});
    const db = await getDB();

    await pullFromSupabase(db, mockSupa as never);

    const listsGt = mockSupa._gtSpies['lists'];
    const tasksGt = mockSupa._gtSpies['tasks'];
    const habitsGt = mockSupa._gtSpies['habit_completions'];

    expect(listsGt).toHaveBeenCalledWith('updated_at', expect.any(String));
    expect(tasksGt).toHaveBeenCalledWith('updated_at', expect.any(String));
    expect(habitsGt).toHaveBeenCalledWith('created_at', expect.any(String));
  });
});

describe('initialSync', () => {
  const LAST_SYNC_KEY = 'todo_last_sync';

  it('clears todo_last_sync from localStorage before pulling', async () => {
    // Pre-set a last sync value
    localStorage.setItem(LAST_SYNC_KEY, '2025-01-01T00:00:00Z');

    let capturedLastSync: string | null = 'not-checked';
    const fromMock = vi.fn().mockImplementation(() => {
      // Capture the value of localStorage at call time (first call = lists)
      capturedLastSync = localStorage.getItem(LAST_SYNC_KEY);
      return {
        select: vi.fn().mockReturnValue({
          gt: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null, data: [] }),
      };
    });

    const db = await getDB();
    await initialSync(db, { from: fromMock } as never);

    // When pullFromSupabase was first invoked, last_sync should have been cleared
    // (initialSync removes it, then pullFromSupabase reads it as the epoch default)
    expect(capturedLastSync).toBeNull();
  });
});
