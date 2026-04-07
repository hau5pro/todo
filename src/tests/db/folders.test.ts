import { describe, it, expect } from 'vitest';
import { getFolders, createFolder, renameFolder, deleteFolder } from '../../db/folders';

describe('folders CRUD', () => {
  it('getFolders returns empty array initially', async () => {
    const folders = await getFolders();
    expect(folders).toEqual([]);
  });

  it('createFolder adds a folder with correct fields', async () => {
    const folder = await createFolder('Work');
    expect(folder.name).toBe('Work');
    expect(folder.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(folder.deleted_at).toBeNull();
    expect(folder.pending_sync).toBe(true);
  });

  it('getFolders returns non-deleted folders', async () => {
    await createFolder('A');
    await createFolder('B');
    const folders = await getFolders();
    expect(folders).toHaveLength(2);
  });

  it('renameFolder updates name and sets pending_sync', async () => {
    const folder = await createFolder('Old');
    const updated = await renameFolder(folder.id, 'New');
    expect(updated.name).toBe('New');
    expect(updated.pending_sync).toBe(true);
  });

  it('deleteFolder soft-deletes (excluded from getFolders)', async () => {
    const folder = await createFolder('Temp');
    await deleteFolder(folder.id);
    const folders = await getFolders();
    expect(folders).toHaveLength(0);
  });
});
