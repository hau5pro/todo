export function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

/** Filter out soft-deleted records (deleted_at !== null). */
export function excludeDeleted<T extends { deleted_at: string | null }>(records: T[]): T[] {
  return records.filter((r) => r.deleted_at === null);
}

const DB_VERSION = 3;

let dbName = 'todo-app-local';
let dbPromise: Promise<IDBDatabase> | null = null;

/** Set the active DB namespace. Returns true if the namespace changed. */
export function initDB(key: 'local' | string): boolean {
  const name = key === 'local' ? 'todo-app-local' : `todo-app-${key}`;
  if (name === dbName) return false;
  dbName = name;
  dbPromise = null;
  return true;
}

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(dbName);
  }
  return dbPromise;
}

/** Call in tests to reset the singleton between test runs. */
export function _resetForTesting(): void {
  dbName = 'todo-app-local';
  dbPromise = null;
}

export function clearAllLocalData(): Promise<void> {
  return getDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(['lists', 'tasks', 'habit_completions', 'folders'], 'readwrite');
        tx.objectStore('lists').clear();
        tx.objectStore('tasks').clear();
        tx.objectStore('habit_completions').clear();
        tx.objectStore('folders').clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

function openDB(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction!;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains('lists')) {
        const lists = db.createObjectStore('lists', { keyPath: 'id' });
        lists.createIndex('type', 'type');
        lists.createIndex('folder_id', 'folder_id');
      }

      if (!db.objectStoreNames.contains('tasks')) {
        const tasks = db.createObjectStore('tasks', { keyPath: 'id' });
        tasks.createIndex('list_id', 'list_id');
        tasks.createIndex('due_date', 'due_date');
      }

      if (!db.objectStoreNames.contains('habit_completions')) {
        const habits = db.createObjectStore('habit_completions', { keyPath: 'id' });
        habits.createIndex('task_id', 'task_id');
        habits.createIndex('date', 'date');
        habits.createIndex('task_id_date', ['task_id', 'date'], { unique: true });
      }

      // v2: folders store + folder_id index on existing lists store
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
        if (db.objectStoreNames.contains('lists')) {
          const listsStore = tx.objectStore('lists');
          if (!listsStore.indexNames.contains('folder_id')) {
            listsStore.createIndex('folder_id', 'folder_id');
          }
        }
      }

      // v3: add note field to existing task records
      if (oldVersion < 3) {
        if (db.objectStoreNames.contains('tasks')) {
          const tasksStore = tx.objectStore('tasks');
          tasksStore.openCursor().onsuccess = function (e) {
            const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (!cursor) return;
            const record = cursor.value;
            if (record.note === undefined) {
              cursor.update({ ...record, note: null });
            }
            cursor.continue();
          };
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
