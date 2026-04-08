import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/index';
import { createList as dbCreateList } from '../../db/lists';
import { createFolder as dbCreateFolder } from '../../db/folders';
import { getLists } from '../../db/lists';

beforeEach(() => {
  useAppStore.getState().reset();
});

describe('store: createList', () => {
  it('adds a new list to the store', async () => {
    const list = await useAppStore.getState().createList('Shopping', 'shopping');
    expect(useAppStore.getState().lists.find((l) => l.id === list.id)).toBeDefined();
    expect(list.name).toBe('Shopping');
    expect(list.type).toBe('shopping');
  });

  it('persists the list in the DB', async () => {
    const list = await useAppStore.getState().createList('Groceries', 'shopping');
    const dbLists = await getLists();
    expect(dbLists.find((l) => l.id === list.id)).toBeDefined();
  });

  it('assigns folder when provided', async () => {
    const folder = await dbCreateFolder('Home');
    const list = await useAppStore.getState().createList('Chores', 'general', folder.id);
    expect(list.folder_id).toBe(folder.id);
  });
});

describe('store: renameList', () => {
  it('updates the list name in the store', async () => {
    const list = await dbCreateList('Old Name', 'general');
    await useAppStore.getState().loadLists();

    await useAppStore.getState().renameList(list.id, 'New Name');

    const updated = useAppStore.getState().lists.find((l) => l.id === list.id);
    expect(updated?.name).toBe('New Name');
  });

  it('persists the rename in the DB', async () => {
    const list = await dbCreateList('Old', 'general');
    await useAppStore.getState().loadLists();
    await useAppStore.getState().renameList(list.id, 'Renamed');
    const dbLists = await getLists();
    expect(dbLists.find((l) => l.id === list.id)?.name).toBe('Renamed');
  });
});

describe('store: updateListIcon', () => {
  it('updates the list icon in the store', async () => {
    const list = await dbCreateList('Tasks', 'general');
    await useAppStore.getState().loadLists();

    await useAppStore.getState().updateListIcon(list.id, '🎯');

    const updated = useAppStore.getState().lists.find((l) => l.id === list.id);
    expect(updated?.icon).toBe('🎯');
  });

  it('clears the icon when null is passed', async () => {
    const list = await dbCreateList('Tasks', 'general');
    await useAppStore.getState().loadLists();
    await useAppStore.getState().updateListIcon(list.id, '📋');
    await useAppStore.getState().updateListIcon(list.id, null);
    const updated = useAppStore.getState().lists.find((l) => l.id === list.id);
    expect(updated?.icon).toBeNull();
  });
});

describe('store: deleteList', () => {
  it('removes the list from the store', async () => {
    const list = await dbCreateList('Temp', 'general');
    await useAppStore.getState().loadLists();

    await useAppStore.getState().deleteList(list.id);

    expect(useAppStore.getState().lists.find((l) => l.id === list.id)).toBeUndefined();
  });

  it('removes the list tasks from the store', async () => {
    const list = await dbCreateList('Temp', 'general');
    await useAppStore.getState().loadTasks(list.id);
    await useAppStore.getState().deleteList(list.id);
    expect(useAppStore.getState().tasksByList[list.id]).toBeUndefined();
  });
});

describe('store: moveListToFolder', () => {
  it('assigns a list to a folder in the store', async () => {
    const folder = await dbCreateFolder('Work');
    const list = await dbCreateList('Projects', 'general');
    await useAppStore.getState().loadLists();

    await useAppStore.getState().moveListToFolder(list.id, folder.id);

    const updated = useAppStore.getState().lists.find((l) => l.id === list.id);
    expect(updated?.folder_id).toBe(folder.id);
  });

  it('moves a list out of a folder when null is passed', async () => {
    const folder = await dbCreateFolder('Work');
    const list = await dbCreateList('Projects', 'general', folder.id);
    await useAppStore.getState().loadLists();

    await useAppStore.getState().moveListToFolder(list.id, null);

    const updated = useAppStore.getState().lists.find((l) => l.id === list.id);
    expect(updated?.folder_id).toBeNull();
  });
});
