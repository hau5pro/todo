const DB_NAME = 'todo-app';
const DB_VERSION = 1;

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

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('lists')) {
        const lists = db.createObjectStore('lists', { keyPath: 'id' });
        lists.createIndex('type', 'type');
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
