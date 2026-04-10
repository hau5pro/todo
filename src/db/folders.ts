import { getDB, req, excludeDeleted } from './client';
import type { ListFolder } from '../types';

export async function getFolders(): Promise<ListFolder[]> {
  const db = await getDB();
  const all = await req<ListFolder[]>(
    db.transaction('folders').objectStore('folders').getAll()
  );
  return excludeDeleted(all);
}

export async function createFolder(name: string): Promise<ListFolder> {
  const folder: ListFolder = {
    id: crypto.randomUUID(),
    name,
    updated_at: new Date().toISOString(),
    deleted_at: null,
    pending_sync: true,
  };
  const db = await getDB();
  await req(db.transaction('folders', 'readwrite').objectStore('folders').add(folder));
  return folder;
}

export async function renameFolder(id: string, name: string): Promise<ListFolder> {
  const db = await getDB();
  const tx = db.transaction('folders', 'readwrite');
  const store = tx.objectStore('folders');
  const existing = await req<ListFolder | undefined>(store.get(id));
  if (!existing) throw new Error(`Folder ${id} not found`);
  const updated: ListFolder = {
    ...existing,
    name,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
  await req(store.put(updated));
  return updated;
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('folders', 'readwrite');
  const store = tx.objectStore('folders');
  const existing = await req<ListFolder | undefined>(store.get(id));
  if (!existing) throw new Error(`Folder ${id} not found`);
  await req(
    store.put({
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: true,
    })
  );
}
