import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/index';
import { createList as dbCreateList } from '../../db/lists';
import { createTask as dbCreateTask } from '../../db/tasks';
import { createFolder as dbCreateFolder } from '../../db/folders';
import { getTasksByList } from '../../db/tasks';
import { getLists } from '../../db/lists';

beforeEach(() => {
  useAppStore.getState().reset();
});

describe('store: completeTask', () => {
  it('marks a task completed in the store', async () => {
    const list = await dbCreateList('Test', 'general');
    const task = await dbCreateTask(list.id, 'Do something');
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().completeTask(task.id, list.id, true);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.completed).toBe(true);
  });

  it('marks a task uncompleted in the store', async () => {
    const list = await dbCreateList('Test', 'general');
    const task = await dbCreateTask(list.id, 'Do something', { completed: true });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().completeTask(task.id, list.id, false);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.completed).toBe(false);
  });
});

describe('store: advanceCyclicalTask', () => {
  it('advances due_date and resets completed in the store', async () => {
    const list = await dbCreateList('Chores', 'general');
    const task = await dbCreateTask(list.id, 'Laundry', {
      due_date: '2026-04-05',
      recurrence_interval: 7,
      recurrence_unit: 'days',
    });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().advanceCyclicalTask(task.id, list.id);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    const updated = tasks.find((t) => t.id === task.id);
    expect(updated?.due_date).toBe('2026-04-12');
    expect(updated?.completed).toBe(false);
  });
});

describe('store: duplicateList', () => {
  it('creates a new list with copied tasks', async () => {
    const list = await dbCreateList('Original', 'general');
    await dbCreateTask(list.id, 'Task A');
    await dbCreateTask(list.id, 'Task B');
    // seed store lists so duplicateList can find the source
    await useAppStore.getState().loadLists();

    const newList = await useAppStore.getState().duplicateList(list.id);

    expect(newList.name).toBe('Original (2)');
    const storeLists = useAppStore.getState().lists;
    expect(storeLists.find((l) => l.id === newList.id)).toBeDefined();

    // Tasks are copied in IDB
    const newTasks = await getTasksByList(newList.id);
    expect(newTasks).toHaveLength(2);
    expect(newTasks.map((t) => t.title).sort()).toEqual(['Task A', 'Task B']);
  });

  it('increments suffix if copy name already exists', async () => {
    const list = await dbCreateList('Work', 'general');
    await dbCreateList('Work (2)', 'general');
    await useAppStore.getState().loadLists();

    const newList = await useAppStore.getState().duplicateList(list.id);

    expect(newList.name).toBe('Work (3)');
  });
});

describe('store: deleteFolder', () => {
  it('removes folder from store and moves its lists to root', async () => {
    const folder = await dbCreateFolder('Projects');
    await dbCreateList('List A', 'general', folder.id);
    await dbCreateList('List B', 'general', folder.id);
    await useAppStore.getState().loadLists();
    await useAppStore.getState().loadFolders();
    // seed folder into store (loadFolders reads DB)
    // add folder to store manually since dbCreateFolder bypasses store
    useAppStore.setState((s) => ({ folders: [...s.folders, folder] }));

    await useAppStore.getState().deleteFolder(folder.id);

    // Folder gone from store
    expect(useAppStore.getState().folders.find((f) => f.id === folder.id)).toBeUndefined();

    // Lists moved to root (folder_id = null)
    const lists = useAppStore.getState().lists;
    const movedLists = lists.filter((l) => l.name === 'List A' || l.name === 'List B');
    expect(movedLists.every((l) => l.folder_id === null)).toBe(true);

    // IDB reflects the move
    const dbLists = await getLists();
    const dbMoved = dbLists.filter((l) => l.name === 'List A' || l.name === 'List B');
    expect(dbMoved.every((l) => l.folder_id === null)).toBe(true);
  });
});
