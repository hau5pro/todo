import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, initDB, clearAllLocalData, excludeDeleted, _resetForTesting } from '../../db/client';
import { createList } from '../../db/lists';
import { createTask } from '../../db/tasks';
import { createFolder } from '../../db/folders';

describe('getDB', () => {
  it('opens the database and creates object stores', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('lists')).toBe(true);
    expect(db.objectStoreNames.contains('tasks')).toBe(true);
    expect(db.objectStoreNames.contains('habit_completions')).toBe(true);
  });

  it('returns the same instance on repeated calls', async () => {
    const db1 = await getDB();
    const db2 = await getDB();
    expect(db1).toBe(db2);
  });
});

describe('initDB', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  it('returns false when called with the same namespace', () => {
    // Default namespace is 'local' — calling again should return false
    const changed = initDB('local');
    expect(changed).toBe(false);
  });

  it('returns true when switching to a new namespace', () => {
    const changed = initDB('user-abc');
    expect(changed).toBe(true);
  });

  it('clears dbPromise when namespace changes (new getDB call opens a fresh DB)', async () => {
    // Warm up the default DB so dbPromise is populated
    const db1 = await getDB();
    expect(db1).toBeDefined();

    // Switch namespace
    initDB('user-xyz');

    // getDB should now return a different database instance
    const db2 = await getDB();
    expect(db2).toBeDefined();
    expect(db2).not.toBe(db1);
  });

  it('returns false when switching to the same user namespace twice', () => {
    initDB('user-abc');
    const changed = initDB('user-abc');
    expect(changed).toBe(false);
  });
});

describe('clearAllLocalData', () => {
  it('wipes all four stores (lists, tasks, habit_completions, folders) while leaving DB open', async () => {
    // Populate each store
    const list = await createList('Shopping', 'shopping');
    await createTask(list.id, 'Eggs');
    await createFolder('Work');
    // habit_completions is tested indirectly — if the transaction succeeds the store is cleared

    // Verify data was written
    const db = await getDB();
    const listsBeforeClear = await new Promise<unknown[]>((res, rej) => {
      const r = db.transaction('lists').objectStore('lists').getAll();
      r.onsuccess = () => res(r.result as unknown[]);
      r.onerror = () => rej(r.error);
    });
    expect(listsBeforeClear.length).toBeGreaterThan(0);

    // Clear
    await clearAllLocalData();

    // All stores must be empty
    const dbAfter = await getDB();
    expect(dbAfter).toBeDefined(); // DB is still open

    for (const storeName of ['lists', 'tasks', 'habit_completions', 'folders'] as const) {
      const records = await new Promise<unknown[]>((res, rej) => {
        const r = dbAfter.transaction(storeName).objectStore(storeName).getAll();
        r.onsuccess = () => res(r.result as unknown[]);
        r.onerror = () => rej(r.error);
      });
      expect(records).toHaveLength(0);
    }
  });
});

describe('excludeDeleted', () => {
  it('returns only records with deleted_at === null', () => {
    const records = [
      { id: '1', deleted_at: null },
      { id: '2', deleted_at: '2026-01-01T00:00:00Z' },
      { id: '3', deleted_at: null },
    ];
    const result = excludeDeleted(records);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual(['1', '3']);
  });

  it('returns empty array when all records are soft-deleted', () => {
    const records = [
      { id: '1', deleted_at: '2026-01-01T00:00:00Z' },
      { id: '2', deleted_at: '2026-01-02T00:00:00Z' },
    ];
    expect(excludeDeleted(records)).toHaveLength(0);
  });

  it('returns all records when none are deleted', () => {
    const records = [
      { id: '1', deleted_at: null },
      { id: '2', deleted_at: null },
    ];
    expect(excludeDeleted(records)).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(excludeDeleted([])).toHaveLength(0);
  });
});
