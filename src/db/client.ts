export function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

const DB_NAME = 'todo-app';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB();
  }
  return dbPromise;
}

/** Call in tests to reset the singleton between test runs. */
export function _resetForTesting(): void {
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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
