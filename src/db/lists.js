import { getDB } from './client';
function req(r) {
    return new Promise((res, rej) => {
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
    });
}
export async function getLists() {
    const db = await getDB();
    const all = await req(db.transaction('lists').objectStore('lists').getAll());
    return all.filter((l) => l.deleted_at === null);
}
export async function getListById(id) {
    const db = await getDB();
    return req(db.transaction('lists').objectStore('lists').get(id));
}
export async function createList(name, type) {
    const list = {
        id: crypto.randomUUID(),
        name,
        type,
        updated_at: new Date().toISOString(),
        deleted_at: null,
        pending_sync: true,
    };
    const db = await getDB();
    await req(db.transaction('lists', 'readwrite').objectStore('lists').add(list));
    return list;
}
export async function updateList(id, changes) {
    const db = await getDB();
    const tx = db.transaction('lists', 'readwrite');
    const store = tx.objectStore('lists');
    const existing = await req(store.get(id));
    const updated = {
        ...existing,
        ...changes,
        updated_at: new Date().toISOString(),
        pending_sync: true,
    };
    await req(store.put(updated));
    return updated;
}
export async function deleteList(id) {
    const db = await getDB();
    const tx = db.transaction('lists', 'readwrite');
    const store = tx.objectStore('lists');
    const existing = await req(store.get(id));
    await req(store.put({
        ...existing,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pending_sync: true,
    }));
}
