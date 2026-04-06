import { create } from 'zustand';
import { getLists, createList as dbCreateList, updateList as dbUpdateList, deleteList as dbDeleteList, } from '../db/lists';
import { getTasksByList, createTask as dbCreateTask, updateTask as dbUpdateTask, softDeleteTask as dbSoftDelete, setTaskCompleted as dbSetCompleted, advanceCyclicalTask as dbAdvanceCyclical, getMyDayTasks, } from '../db/tasks';
import { getTodayCompletions } from '../db/habits';
// ── Helpers ───────────────────────────────────────────────────────────────────
function updateTaskInSlices(s, listId, updater) {
    const patchList = (arr) => arr.map((t) => (t.list_id === listId ? updater(t) : t));
    return {
        tasksByList: {
            ...s.tasksByList,
            [listId]: (s.tasksByList[listId] ?? []).map(updater),
        },
        myDayOverdue: patchList(s.myDayOverdue),
        myDayToday: patchList(s.myDayToday),
    };
}
function removeTaskFromSlices(s, listId, taskId) {
    return {
        tasksByList: {
            ...s.tasksByList,
            [listId]: (s.tasksByList[listId] ?? []).filter((t) => t.id !== taskId),
        },
        myDayOverdue: s.myDayOverdue.filter((t) => t.id !== taskId),
        myDayToday: s.myDayToday.filter((t) => t.id !== taskId),
    };
}
export const useAppStore = create((set, get) => ({
    lists: [],
    listsLoaded: false,
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
        const habitTasks = (await Promise.all(dailyLists.map((l) => getTasksByList(l.id)))).flat();
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
    createList: async (name, type) => {
        const list = await dbCreateList(name, type);
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
            tasksByList: Object.fromEntries(Object.entries(s.tasksByList).filter(([k]) => k !== id)),
        }));
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
    completeTask: async (id, listId, completed) => {
        const updated = await dbSetCompleted(id, completed);
        set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
        if (get().myDayLoaded)
            get().loadMyDay();
    },
    shoppingCompleteTask: async (id, listId) => {
        await dbSoftDelete(id);
        // Mark as soft-deleted in store so "recently completed" section still works
        set((s) => updateTaskInSlices(s, listId, (t) => t.id === id ? { ...t, deleted_at: new Date().toISOString() } : t));
    },
    advanceCyclicalTask: async (id, listId) => {
        const updated = await dbAdvanceCyclical(id);
        set((s) => updateTaskInSlices(s, listId, (t) => (t.id === id ? updated : t)));
        if (get().myDayLoaded)
            get().loadMyDay();
    },
    removeTask: async (id, listId) => {
        await dbSoftDelete(id);
        set((s) => removeTaskFromSlices(s, listId, id));
        if (get().myDayLoaded)
            get().loadMyDay();
    },
}));
