// src/tests/db/sync.test.ts
import { describe, it, expect, vi } from 'vitest';
import { pushPending, pullFromSupabase } from '../../db/sync';
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

describe('pushPending', () => {
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
