import { getDB } from './client';
import type { ListFolder } from '../types';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function getFolders(): Promise<ListFolder[]> {
  const db = await getDB();
  const all = await req<ListFolder[]>(
    db.transaction('folders').objectStore('folders').getAll()
  );
  return all.filter((f) => f.deleted_at === null);
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
  const existing = await req<ListFolder>(store.get(id));
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
  const existing = await req<ListFolder>(store.get(id));
  await req(
    store.put({
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: true,
    })
  );
}
