import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useList } from '../../hooks/useList';
import { createList as dbCreateList } from '../../db/lists';
import { createTask as dbCreateTask } from '../../db/tasks';

describe('useList', () => {
  it('loads the list and its tasks', async () => {
    const list = await dbCreateList('Inbox', 'general');
    await dbCreateTask(list.id, 'Task A');
    await dbCreateTask(list.id, 'Task B');

    const { result } = renderHook(() => useList(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.list?.id).toBe(list.id);
    expect(result.current.list?.name).toBe('Inbox');
    expect(result.current.tasks).toHaveLength(2);
  });

  it('returns null list and empty tasks for a non-existent id', async () => {
    const { result } = renderHook(() => useList('nonexistent-id'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.list).toBeNull();
    expect(result.current.tasks).toHaveLength(0);
  });

  it('starts with isLoading true', () => {
    const { result } = renderHook(() => useList('any-id'));
    expect(result.current.isLoading).toBe(true);
  });

  it('reloads when reload() is called', async () => {
    const list = await dbCreateList('Work', 'general');
    const { result } = renderHook(() => useList(list.id));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tasks).toHaveLength(0);

    // add a task directly to DB then reload
    await dbCreateTask(list.id, 'New task');
    result.current.reload();

    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
  });
});
