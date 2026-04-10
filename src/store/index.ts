import { create } from 'zustand';
import { requestSync } from '../sync/orchestrator';
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
  bulkUpdateTaskGroup as dbBulkUpdateGroup,
  softDeleteTask as dbSoftDelete,
  setTaskCompleted as dbSetCompleted,
  advanceCyclicalTask as dbAdvanceCyclical,
  advanceRecurringTask as dbAdvanceRecurring,
  getMyDayTasks,
} from '../db/tasks';
import { getTodayCompletions, getCompletionsForTask, calculateStreak } from '../db/habits';
import { getTodayString } from '../utils/date';
import type { List, ListFolder, Task, ListType } from '../types';

export interface HabitWithCompletion {
  task: Task;
  completedToday: boolean;
  streak: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function updateTaskInSlices(
  s: AppStore,
  listId: string,
  updater: (t: Task) => Task
) {
  const patchList = (arr: Task[]) => arr.map((t) => (t.list_id === listId ? updater(t) : t));
  const existingList = s.tasksByList[listId];
  return {
    tasksByList: existingList !== undefined
      ? { ...s.tasksByList, [listId]: existingList.map(updater) }
      : s.tasksByList,
    myDayOverdue: patchList(s.myDayOverdue),
    myDayToday: patchList(s.myDayToday),
  };
}

function removeTaskFromSlices(s: AppStore, listId: string, taskId: string) {
  const existingList = s.tasksByList[listId];
  return {
    tasksByList: existingList !== undefined
      ? { ...s.tasksByList, [listId]: existingList.filter((t) => t.id !== taskId) }
      : s.tasksByList,
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

  // Reset (call when DB namespace switches)
  reset: () => void;

  // Loaders
  loadLists: () => Promise<void>;
  loadFolders: () => Promise<void>;
  loadTasks: (listId: string) => Promise<void>;
  loadMyDay: () => Promise<void>;

  // List mutations
  createList: (name: string, type: ListType, folderId?: string | null) => Promise<List>;
  renameList: (id: string, name: string) => Promise<void>;
  updateListIcon: (id: string, icon: string | null) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  moveListToFolder: (listId: string, folderId: string | null) => Promise<void>;
  duplicateList: (id: string) => Promise<List>;

  // Folder mutations
  createFolder: (name: string) => Promise<ListFolder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<{ movedListIds: string[] }>;
  duplicateFolder: (id: string) => Promise<ListFolder>;

  // Task mutations
  addTask: (listId: string, title: string, group?: string | null) => Promise<Task>;
  renameTask: (id: string, listId: string, title: string) => Promise<Task>;
  updateTaskFields: (id: string, listId: string, fields: Partial<Pick<Task, 'due_date' | 'due_time' | 'rrule'>>) => Promise<Task>;
  moveTaskToGroup: (id: string, listId: string, group: string | null) => Promise<Task>;
  renameGroup: (listId: string, oldName: string, newName: string) => Promise<void>;
  deleteGroup: (listId: string, name: string) => Promise<void>;
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

  // ── Reset ──────────────────────────────────────────────────────────────────

  reset: () => set({
    lists: [], listsLoaded: false,
    folders: [], foldersLoaded: false,
    tasksByList: {},
    myDayOverdue: [], myDayToday: [], myDayHabits: [], myDayLoaded: false,
  }),

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
    const todayDate = getTodayString();

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

    const myDayHabits = await Promise.all(
      habitTasks.map(async (task) => {
        const completions = await getCompletionsForTask(task.id);
        return {
          task,
          completedToday: completedIds.has(task.id),
          streak: calculateStreak(completions, task.id, todayDate),
        };
      })
    );

    set({ myDayOverdue: overdue, myDayToday: today, myDayHabits, myDayLoaded: true });
  },

  // ── List mutations ─────────────────────────────────────────────────────────

  createList: async (name, type, folderId) => {
    const list = await dbCreateList(name, type, folderId);
    set((s) => ({ lists: [...s.lists, list] }));
    requestSync();
    return list;
  },

  renameList: async (id, name) => {
    await dbUpdateList(id, { name });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, name } : l)),
    }));
    requestSync();
  },

  updateListIcon: async (id, icon) => {
    await dbUpdateList(id, { icon });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, icon } : l)),
    }));
    requestSync();
  },

  deleteList: async (id) => {
    await dbDeleteList(id);
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== id),
      tasksByList: Object.fromEntries(
        Object.entries(s.tasksByList).filter(([k]) => k !== id)
      ),
    }));
    requestSync();
  },

  moveListToFolder: async (listId, folderId) => {
    await dbUpdateList(listId, { folder_id: folderId });
    set((s) => ({
      lists: s.lists.map((l) => (l.id === listId ? { ...l, folder_id: folderId } : l)),
    }));
    requestSync();
  },

  duplicateList: async (id) => {
    const source = get().lists.find((l) => l.id === id);
    if (!source) throw new Error(`List ${id} not found`);
    const existingNames = new Set(get().lists.map((l) => l.name));
    const baseName = source.name.replace(/ \(\d+\)$/, '');
    let n = 2;
    let copyName = `${baseName} (${n})`;
    while (existingNames.has(copyName)) copyName = `${baseName} (${++n})`;
    const newList = await dbCreateList(copyName, source.type, source.folder_id);
    const sourceTasks = await getTasksByList(id);
    const newTasks = await Promise.all(
      sourceTasks.map((t) =>
        dbCreateTask(newList.id, t.title, {
          completed: t.completed,
          due_date: t.due_date ?? undefined,
          recurrence_interval: t.recurrence_interval ?? undefined,
          recurrence_unit: t.recurrence_unit ?? undefined,
          rrule: t.rrule ?? undefined,
          group: t.group ?? undefined,
        })
      )
    );
    set((s) => ({
      lists: [...s.lists, newList],
      tasksByList: { ...s.tasksByList, [newList.id]: newTasks },
    }));
    requestSync();
    return newList;
  },

  // ── Folder mutations ───────────────────────────────────────────────────────

  createFolder: async (name) => {
    const folder = await dbCreateFolder(name);
    set((s) => ({ folders: [...s.folders, folder] }));
    requestSync();
    return folder;
  },

  renameFolder: async (id, name) => {
    await dbRenameFolder(id, name);
    set((s) => ({
      folders: s.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    }));
    requestSync();
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
    requestSync();
    return { movedListIds: listsInFolder.map((l) => l.id) };
  },

  duplicateFolder: async (id) => {
    const source = get().folders.find((f) => f.id === id);
    if (!source) throw new Error(`Folder ${id} not found`);
    const existingFolderNames = new Set(get().folders.map((f) => f.name));
    const folderBase = source.name.replace(/ \(\d+\)$/, '');
    let n = 2;
    let folderCopyName = `${folderBase} (${n})`;
    while (existingFolderNames.has(folderCopyName)) folderCopyName = `${folderBase} (${++n})`;
    const newFolder = await dbCreateFolder(folderCopyName);
    const listsInFolder = get().lists.filter((l) => l.folder_id === id && !l.deleted_at);
    const allListNames = new Set(get().lists.map((l) => l.name));
    const newEntries: { list: List; tasks: Task[] }[] = [];
    for (const sourceList of listsInFolder) {
      const listBase = sourceList.name.replace(/ \(\d+\)$/, '');
      let ln = 2;
      let listCopyName = `${listBase} (${ln})`;
      while (allListNames.has(listCopyName)) listCopyName = `${listBase} (${++ln})`;
      allListNames.add(listCopyName);
      const newList = await dbCreateList(listCopyName, sourceList.type, newFolder.id);
      const sourceTasks = await getTasksByList(sourceList.id);
      const newTasks = await Promise.all(
        sourceTasks.map((t) =>
          dbCreateTask(newList.id, t.title, {
            completed: t.completed,
            due_date: t.due_date ?? undefined,
            recurrence_interval: t.recurrence_interval ?? undefined,
            recurrence_unit: t.recurrence_unit ?? undefined,
            rrule: t.rrule ?? undefined,
            group: t.group ?? undefined,
          })
        )
      );
      newEntries.push({ list: newList, tasks: newTasks });
    }
    set((s) => ({
      folders: [...s.folders, newFolder],
      lists: [...s.lists, ...newEntries.map(({ list }) => list)],
      tasksByList: {
        ...s.tasksByList,
        ...Object.fromEntries(newEntries.map(({ list, tasks }) => [list.id, tasks])),
      },
    }));
    requestSync();
    return newFolder;
  },

  // ── Task mutations ─────────────────────────────────────────────────────────

  addTask: async (listId, title, group) => {
    const task = await dbCreateTask(listId, title, { group: group ?? null });
    set((s) => ({
      tasksByList: {
        ...s.tasksByList,
        [listId]: [...(s.tasksByList[listId] ?? []), task],
      },
    }));
    requestSync();
    return task;
  },

  moveTaskToGroup: async (id, listId, group) => {
    const updated = await dbUpdateTask(id, { group });
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    requestSync();
    return updated;
  },

  renameGroup: async (listId, oldName, newName) => {
    const updated = await dbBulkUpdateGroup(listId, oldName, newName);
    set((s) => ({
      tasksByList: {
        ...s.tasksByList,
        [listId]: (s.tasksByList[listId] ?? []).map((t) => {
          const u = updated.find((ut) => ut.id === t.id);
          return u ?? t;
        }),
      },
    }));
    requestSync();
  },

  deleteGroup: async (listId, name) => {
    const updated = await dbBulkUpdateGroup(listId, name, null);
    set((s) => ({
      tasksByList: {
        ...s.tasksByList,
        [listId]: (s.tasksByList[listId] ?? []).map((t) => {
          const u = updated.find((ut) => ut.id === t.id);
          return u ?? t;
        }),
      },
    }));
    requestSync();
  },

  renameTask: async (id, listId, title) => {
    const updated = await dbUpdateTask(id, { title });
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    requestSync();
    return updated;
  },

  updateTaskFields: async (id, listId, fields) => {
    const updated = await dbUpdateTask(id, fields);
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    if (get().myDayLoaded) get().loadMyDay();
    requestSync();
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
        requestSync();
        return;
      }
    }
    const updated = await dbSetCompleted(id, completed);
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    if (get().myDayLoaded) get().loadMyDay();
    requestSync();
  },

  advanceCyclicalTask: async (id, listId) => {
    const updated = await dbAdvanceCyclical(id);
    set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
    if (get().myDayLoaded) get().loadMyDay();
    requestSync();
  },

  removeTask: async (id, listId) => {
    await dbSoftDelete(id);
    set((s) => removeTaskFromSlices(s, listId, id));
    if (get().myDayLoaded) get().loadMyDay();
    requestSync();
  },
}));
