import { getDB, req } from './client';
import type { List, ListType } from '../types';

export async function getLists(): Promise<List[]> {
  const db = await getDB();
  const all = await req<List[]>(
    db.transaction('lists').objectStore('lists').getAll()
  );
  return all
    .filter((l) => l.deleted_at === null)
    .map((l) => ({ ...l, icon: l.icon ?? null, folder_id: l.folder_id ?? null }));
}

export async function getListById(id: string): Promise<List | undefined> {
  const db = await getDB();
  const l = await req<List>(db.transaction('lists').objectStore('lists').get(id));
  return l ? { ...l, icon: l.icon ?? null, folder_id: l.folder_id ?? null } : undefined;
}

export async function createList(name: string, type: ListType, folderId?: string | null): Promise<List> {
  const list: List = {
    id: crypto.randomUUID(),
    name,
    type,
    icon: null,
    folder_id: folderId ?? null,
    updated_at: new Date().toISOString(),
    deleted_at: null,
    pending_sync: true,
  };
  const db = await getDB();
  await req(db.transaction('lists', 'readwrite').objectStore('lists').add(list));
  return list;
}

export async function updateList(id: string, changes: Partial<Pick<List, 'name' | 'icon' | 'folder_id'>>): Promise<List> {
  const db = await getDB();
  const tx = db.transaction('lists', 'readwrite');
  const store = tx.objectStore('lists');
  const existing = await req<List>(store.get(id));
  const updated: List = {
    ...existing,
    folder_id: existing.folder_id ?? null,
    ...changes,
    updated_at: new Date().toISOString(),
    pending_sync: true,
  };
  await req(store.put(updated));
  return updated;
}

export async function deleteList(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('lists', 'readwrite');
  const store = tx.objectStore('lists');
  const existing = await req<List>(store.get(id));
  await req(
    store.put({
      ...existing,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: true,
    })
  );
}
