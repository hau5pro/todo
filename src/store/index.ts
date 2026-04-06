import { create } from 'zustand';
import {
  getLists,
  createList as dbCreateList,
  updateList as dbUpdateList,
  deleteList as dbDeleteList,
} from '../db/lists';
import {
  getFolders,
  createFolder as dbCreateFolder,
  renameFolder as dbRenameFolder,
  deleteFolder as dbDeleteFolder,
} from '../db/folders';
import {
  getTasksByList,
  createTask as dbCreateTask,
  updateTask as dbUpdateTask,
  softDeleteTask as dbSoftDelete,
  setTaskCompleted as dbSetCompleted,
  advanceCyclicalTask as dbAdvanceCyclical,
  advanceRecurringTask as dbAdvanceRecurring,
  getMyDayTasks,
} from '../db/tasks';
import { getTodayCompletions } from '../db/habits';
import type { List, ListFolder, Task, ListType } from '../types';

export interface HabitWithCompletion {
  task: Task;
  completedToday: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function updateTaskInSlices(
  s: AppStore,
  listId: string,
  updater: (t: Task) => Task
) {
  const patchList = (arr: Task[]) => arr.map((t) => (t.list_id === listId ? updater(t) : t));
  return {
    tasksByList: {
      ...s.tasksByList,
      [listId]: (s.tasksByList[listId] ?? []).map(updater),
    },
    myDayOverdue: patchList(s.myDayOverdue),
    myDayToday: patchList(s.myDayToday),
  };
}

function removeTaskFromSlices(s: AppStore, listId: string, taskId: string) {
  return {
    tasksByList: {
      ...s.tasksByList,
      [listId]: (s.tasksByList[listId] ?? []).filter((t) => t.id !== taskId),
    },
    myDayOverdue: s.myDayOverdue.filter((t) => t.id !== taskId),
    myDayToday: s.myDayToday.filter((t) => t.id !== taskId),
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface AppStore {
  // Lists
  lists: List[];
  listsLoaded: boolean;

  // Folders
  folders: ListFolder[];
  foldersLoaded: boolean;

  // Tasks (per list; always includes soft-deleted so shopping "recent" works)
  tasksByList: Record<string, Task[]>;

  // My Day
  myDayOverdue: Task[];
  myDayToday: Task[];
  myDayHabits: HabitWithCompletion[];
  myDayLoaded: boolean;

  // Loaders
  loadLists: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadTasks: (listId: string) => Promise<void>;
  loadMyDay: () => Promise<void>;

  // List mutations
  createList: (name: string, type: ListType, folderId?: string | null) => Promise<List>;
  renameList: (id: string, name: string) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  moveListToFolder: (listId: string, folderId: string | null) => Promise<void>;
  duplicateList: (id: string) => Promise<List>;

  // Folder mutations
  createFolder: (name: string) => Promise<ListFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<{ movedListIds: string[] }>;

  // Task mutations
  addTask: (listId: string, title: string) => Promise<Task>;
  renameTask: (id: string, listId: string, title: string) => Promise<Task>;
  updateTaskFields: (id: string, listId: string, fields: Partial<Pick<Task, 'due_date' | 'rrule'>>) => Promise<Task>;
  completeTask: (id: string, listId: string, completed: boolean) => Promise<void>;
  advanceCyclicalTask: (id: string, listId: string) => Promise<void>;
  removeTask: (id: string, listId: string) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  lists: [],
  listsLoaded: false,
  folders: [],
  foldersLoaded: false,
  tasksByList: {},
  myDayOverdue: [],
  myDayToday: [],
  myDayHabits: [],
  myDayLoaded: false,

  // ── Loaders ────────────────────────────────────────────────────────────────

  loadLists: async () => {
    const lists = await getLists();
    set({ lists, listsLoaded: true });
  },

  loadFolders: async () => {
    const folders = await getFolders();
    set({ folders, foldersLoaded: true });
  },

  loadTasks: async (listId) => {
    const tasks = await getTasksByList(listId, { includeDeleted: true });
    set((s) => ({ tasksByList: { ...s.tasksByList, [listId]: tasks } }));
  },

  loadMyDay: async () => {
    const todayDate = new Date().toISOString().split('T')[0];

    // Reuse already-loaded lists or fetch them
    let { lists } = get();
    if (!get().listsLoaded) {
      lists = await getLists();
      set({ lists, listsLoaded: true });
    }

    const [{ overdue, today }, todayCompletions] = await Promise.all([
      getMyDayTasks(todayDate),
      getTodayCompletions(todayDate),
    ]);

    const dailyLists = lists.filter((l) => l.type === 'daily');
    const habitTasks = (
      await Promise.all(dailyLists.map((l) => getTasksByList(l.id)))
    ).flat();

    const completedIds = new Set(todayCompletions.map((c) => c.task_id));

    set({
      myDayOverdue: overdue,
      myDayToday: today,
      myDayHabits: habitTasks.map((task) => ({
        task,
        completedToday: completedIds.has(task.id),
      })),
      myDayLoaded: true,
    });
  },

  // ── List mutations ─────────────────────────────────────────────────────────

  createList: async (name, type, folderId) => {
    const list = await dbCreateList(name, type, folderId);
    set((s) => ({ lists: [...s.lists, list] }));
    return list;
  },

  renameList: async (id, name) => {
    await dbUpdateList(id, { name });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, name } : l)),
    }));
  },

  deleteList: async (id) => {
    await dbDeleteList(id);
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== id),
      tasksByList: Object.fromEntries(
        Object.entries(s.tasksByList).filter(([k]) => k !== id)
      ),
    }));
  },

  moveListToFolder: async (listId, folderId) => {
    await dbUpdateList(listId, { folder_id: folderId });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === listId ? { ...l, folder_id: folderId } : l)),
    }));
  },

  duplicateList: async (id) => {
    const source = get().lists.find((l) => l.id === id);
    if (!source) throw new Error(`List ${id} not found`);
    const newList = await dbCreateList(`${source.name} (copy)`, source.type, source.folder_id);
    const sourceTasks = await getTasksByList(id);
    const newTasks = await Promise.all(
      sourceTasks.map((t) =>
        dbCreateTask(newList.id, t.title, {
          completed: t.completed,
          due_date: t.due_date ?? undefined,
          recurrence_interval: t.recurrence_interval ?? undefined,
          recurrence_unit: t.recurrence_unit ?? undefined,
          rrule: t.rrule ?? undefined,
        })
      )
    );
    set((s) => ({
      lists: [...s.lists, newList],
      tasksByList: { ...s.tasksByList, [newList.id]: newTasks },
    }));
    return newList;
  },

  // ── Folder mutations ───────────────────────────────────────────────────────

  createFolder: async (name) => {
    const folder = await dbCreateFolder(name);
    set((s) => ({ folders: [...s.folders, folder] }));
    return folder;
  },

  renameFolder: async (id, name) => {
    await dbRenameFolder(id, name);
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
  },

  deleteFolder: async (id) => {
    // Move all lists in this folder back to root
    const listsInFolder = get().lists.filter((l) => l.folder_id === id);
    await Promise.all(listsInFolder.map((l) => dbUpdateList(l.id, { folder_id: null })));
    await dbDeleteFolder(id);
    set((s) => ({
      folders: s.folders.filter((f) => f.id !== id),
      lists: s.lists.map((l) => (l.folder_id === id ? { ...l, folder_id: null } : l)),
    }));
    return { movedListIds: listsInFolder.map((l) => l.id) };
  },

  // ── Task mutations ─────────────────────────────────────────────────────────

  addTask: async (listId, title) => {
    const task = await dbCreateTask(listId, title);
    set((s) => ({
      tasksByList: {
        ...s.tasksByList,
        [listId]: [...(s.tasksByList[listId] ?? []), task],
      },
    }));
    return task;
  },

  renameTask: async (id, listId, title) => {
    const updated = await dbUpdateTask(id, { title });
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    return updated;
  },

  updateTaskFields: async (id, listId, fields) => {
    const updated = await dbUpdateTask(id, fields);
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    if (get().myDayLoaded) get().loadMyDay();
    return updated;
  },

  completeTask: async (id, listId, completed) => {
    if (completed) {
      const task =
        get().tasksByList[listId]?.find((t) => t.id === id) ??
        get().myDayOverdue.find((t) => t.id === id) ??
        get().myDayToday.find((t) => t.id === id);
      if (task?.rrule && task?.due_date) {
        const updated = await dbAdvanceRecurring(id);
        set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
        if (get().myDayLoaded) get().loadMyDay();
        return;
      }
    }
    const updated = await dbSetCompleted(id, completed);
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    if (get().myDayLoaded) get().loadMyDay();
  },


  advanceCyclicalTask: async (id, listId) => {
    const updated = await dbAdvanceCyclical(id);
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    if (get().myDayLoaded) get().loadMyDay();
  },

  removeTask: async (id, listId) => {
    await dbSoftDelete(id);
    set((s) => removeTaskFromSlices(s, listId, id));
    if (get().myDayLoaded) get().loadMyDay();
  },
}));
