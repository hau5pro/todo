import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/index';
import { createFolder as dbCreateFolder } from '../../db/folders';
import { getFolders } from '../../db/folders';

beforeEach(() => {
  useAppStore.getState().reset();
});

describe('store: createFolder', () => {
  it('adds a new folder to the store', async () => {
    const folder = await useAppStore.getState().createFolder('Work');
    expect(useAppStore.getState().folders.find((f) => f.id === folder.id)).toBeDefined();
    expect(folder.name).toBe('Work');
  });

  it('persists the folder in the DB', async () => {
    const folder = await useAppStore.getState().createFolder('Personal');
    const dbFolders = await getFolders();
    expect(dbFolders.find((f) => f.id === folder.id)).toBeDefined();
  });
});

describe('store: renameFolder', () => {
  it('updates the folder name in the store', async () => {
    const folder = await dbCreateFolder('Old');
    await useAppStore.getState().loadFolders();

    await useAppStore.getState().renameFolder(folder.id, 'New');

    const updated = useAppStore.getState().folders.find((f) => f.id === folder.id);
    expect(updated?.name).toBe('New');
  });

  it('persists the rename in the DB', async () => {
    const folder = await dbCreateFolder('Before');
    await useAppStore.getState().loadFolders();
    await useAppStore.getState().renameFolder(folder.id, 'After');
    const dbFolders = await getFolders();
    expect(dbFolders.find((f) => f.id === folder.id)?.name).toBe('After');
  });
});
