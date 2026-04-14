import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getLists, getListById, createList, updateList, deleteList } from '../../db/lists';
import { createTask, getTasksByList } from '../../db/tasks';
import { _resetForTesting } from '../../db/client';

describe('lists CRUD', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    _resetForTesting();
  });

  it('getLists returns empty array initially', async () => {
    const lists = await getLists();
    expect(lists).toEqual([]);
  });

  it('createList adds a list with correct fields', async () => {
    const list = await createList('Groceries', 'shopping');
    expect(list.name).toBe('Groceries');
    expect(list.type).toBe('shopping');
    expect(list.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(list.deleted_at).toBeNull();
    expect(list.pending_sync).toBe(true);
  });

  it('getLists returns non-deleted lists', async () => {
    await createList('A', 'general');
    await createList('B', 'general');
    const lists = await getLists();
    expect(lists).toHaveLength(2);
  });

  it('updateList changes name and sets pending_sync', async () => {
    const list = await createList('Old', 'general');
    const updated = await updateList(list.id, { name: 'New' });
    expect(updated.name).toBe('New');
    expect(updated.pending_sync).toBe(true);
  });

  it('deleteList soft-deletes (sets deleted_at)', async () => {
    const list = await createList('Temp', 'general');
    await deleteList(list.id);
    const lists = await getLists();
    expect(lists).toHaveLength(0);
  });

  it('deleteList soft-deletes all tasks in the list', async () => {
    const list = await createList('Doomed', 'general');
    await createTask(list.id, 'Task 1');
    await createTask(list.id, 'Task 2');
    await deleteList(list.id);
    const tasks = await getTasksByList(list.id, { includeDeleted: false });
    expect(tasks).toHaveLength(0);
    const allTasks = await getTasksByList(list.id, { includeDeleted: true });
    expect(allTasks).toHaveLength(2);
    expect(allTasks.every((t) => t.deleted_at !== null)).toBe(true);
  });

  it('getListById returns the list when it exists', async () => {
    const list = await createList('Found', 'general');
    const found = await getListById(list.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(list.id);
    expect(found!.name).toBe('Found');
  });

  it('getListById returns undefined when ID does not exist', async () => {
    const found = await getListById('nonexistent-id');
    expect(found).toBeUndefined();
  });
});
