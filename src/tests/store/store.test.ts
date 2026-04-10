import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/index';
import { createList as dbCreateList } from '../../db/lists';
import { createTask as dbCreateTask } from '../../db/tasks';
import { createFolder as dbCreateFolder } from '../../db/folders';
import { getTasksByList } from '../../db/tasks';
import { getLists } from '../../db/lists';

beforeEach(() => {
  useAppStore.getState().reset();
});

describe('store: completeTask', () => {
  it('marks a task completed in the store', async () => {
    const list = await dbCreateList('Test', 'general');
    const task = await dbCreateTask(list.id, 'Do something');
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().completeTask(task.id, list.id, true);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.completed).toBe(true);
  });

  it('marks a task uncompleted in the store', async () => {
    const list = await dbCreateList('Test', 'general');
    const task = await dbCreateTask(list.id, 'Do something', { completed: true });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().completeTask(task.id, list.id, false);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    expect(tasks.find((t) => t.id === task.id)?.completed).toBe(false);
  });
});

describe('store: advanceCyclicalTask', () => {
  it('advances due_date and resets completed in the store', async () => {
    const list = await dbCreateList('Chores', 'general');
    const task = await dbCreateTask(list.id, 'Laundry', {
      due_date: '2026-04-05',
      recurrence_interval: 7,
      recurrence_unit: 'days',
    });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().advanceCyclicalTask(task.id, list.id);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    const updated = tasks.find((t) => t.id === task.id);
    expect(updated?.due_date).toBe('2026-04-12');
    expect(updated?.completed).toBe(false);
  });
});

describe('store: duplicateList', () => {
  it('creates a new list with copied tasks', async () => {
    const list = await dbCreateList('Original', 'general');
    await dbCreateTask(list.id, 'Task A');
    await dbCreateTask(list.id, 'Task B');
    // seed store lists so duplicateList can find the source
    await useAppStore.getState().loadLists();

    const newList = await useAppStore.getState().duplicateList(list.id);

    expect(newList.name).toBe('Original (2)');
    const storeLists = useAppStore.getState().lists;
    expect(storeLists.find((l) => l.id === newList.id)).toBeDefined();

    // Tasks are copied in IDB
    const newTasks = await getTasksByList(newList.id);
    expect(newTasks).toHaveLength(2);
    expect(newTasks.map((t) => t.title).sort()).toEqual(['Task A', 'Task B']);
  });

  it('increments suffix if copy name already exists', async () => {
    const list = await dbCreateList('Work', 'general');
    await dbCreateList('Work (2)', 'general');
    await useAppStore.getState().loadLists();

    const newList = await useAppStore.getState().duplicateList(list.id);

    expect(newList.name).toBe('Work (3)');
  });
});

describe('store: deleteFolder', () => {
  it('removes folder from store and moves its lists to root', async () => {
    const folder = await dbCreateFolder('Projects');
    await dbCreateList('List A', 'general', folder.id);
    await dbCreateList('List B', 'general', folder.id);
    await useAppStore.getState().loadLists();
    await useAppStore.getState().loadFolders();
    // seed folder into store (loadFolders reads DB)
    // add folder to store manually since dbCreateFolder bypasses store
    useAppStore.setState((s) => ({ folders: [...s.folders, folder] }));

    await useAppStore.getState().deleteFolder(folder.id);

    // Folder gone from store
    expect(useAppStore.getState().folders.find((f) => f.id === folder.id)).toBeUndefined();

    // Lists moved to root (folder_id = null)
    const lists = useAppStore.getState().lists;
    const movedLists = lists.filter((l) => l.name === 'List A' || l.name === 'List B');
    expect(movedLists.every((l) => l.folder_id === null)).toBe(true);

    // IDB reflects the move
    const dbLists = await getLists();
    const dbMoved = dbLists.filter((l) => l.name === 'List A' || l.name === 'List B');
    expect(dbMoved.every((l) => l.folder_id === null)).toBe(true);
  });
});

describe('store: duplicateFolder', () => {
  it('creates a new folder with copied lists and tasks', async () => {
    const folder = await dbCreateFolder('Work');
    const listA = await dbCreateList('Inbox', 'general', folder.id);
    const listB = await dbCreateList('Sprint', 'general', folder.id);
    await dbCreateTask(listA.id, 'Task 1');
    await dbCreateTask(listA.id, 'Task 2');
    await dbCreateTask(listB.id, 'Task 3');
    await useAppStore.getState().loadLists();
    await useAppStore.getState().loadFolders();

    const newFolder = await useAppStore.getState().duplicateFolder(folder.id);

    // New folder has suffix-incremented name
    expect(newFolder.name).toBe('Work (2)');

    // New folder appears in store
    const storeFolders = useAppStore.getState().folders;
    expect(storeFolders.find((f) => f.id === newFolder.id)).toBeDefined();

    // Two new lists appear in store, belonging to the new folder
    const storeLists = useAppStore.getState().lists;
    const newLists = storeLists.filter((l) => l.folder_id === newFolder.id);
    expect(newLists).toHaveLength(2);
    expect(newLists.map((l) => l.name).sort()).toEqual(['Inbox (2)', 'Sprint (2)']);

    // Tasks were copied to the new lists in IDB
    const inboxCopy = newLists.find((l) => l.name === 'Inbox (2)')!;
    const sprintCopy = newLists.find((l) => l.name === 'Sprint (2)')!;
    const inboxTasks = await getTasksByList(inboxCopy.id);
    const sprintTasks = await getTasksByList(sprintCopy.id);
    expect(inboxTasks.map((t) => t.title).sort()).toEqual(['Task 1', 'Task 2']);
    expect(sprintTasks.map((t) => t.title).sort()).toEqual(['Task 3']);
  });

  it('increments folder suffix if copy name already exists', async () => {
    const folder = await dbCreateFolder('Projects');
    await dbCreateFolder('Projects (2)');
    await useAppStore.getState().loadLists();
    await useAppStore.getState().loadFolders();

    const newFolder = await useAppStore.getState().duplicateFolder(folder.id);

    expect(newFolder.name).toBe('Projects (3)');
  });

  it('increments list suffix independently of folder suffix', async () => {
    const folder = await dbCreateFolder('Team');
    const list = await dbCreateList('Notes', 'general', folder.id);
    // Pre-create a list named 'Notes (2)' at root so the copy must use (3)
    await dbCreateList('Notes (2)', 'general', null);
    await useAppStore.getState().loadLists();
    await useAppStore.getState().loadFolders();

    const newFolder = await useAppStore.getState().duplicateFolder(folder.id);

    const storeLists = useAppStore.getState().lists;
    const newLists = storeLists.filter((l) => l.folder_id === newFolder.id);
    expect(newLists).toHaveLength(1);
    expect(newLists[0].name).toBe('Notes (3)');

    // Silence unused-variable warning — list only needed to set up fixture
    void list;
  });
});

describe('store: loadMyDay', () => {
  it('sets myDayLoaded and populates myDayToday with a due-today task', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const list = await dbCreateList('General', 'general');
    await dbCreateTask(list.id, 'Due today task', { due_date: today });
    await useAppStore.getState().loadLists();

    await useAppStore.getState().loadMyDay();

    expect(useAppStore.getState().myDayLoaded).toBe(true);
    const todayTasks = useAppStore.getState().myDayToday;
    expect(todayTasks.some((t) => t.title === 'Due today task')).toBe(true);
  });

  it('reuses already-loaded lists without re-fetching', async () => {
    const list = await dbCreateList('Existing', 'general');
    await useAppStore.getState().loadLists();
    // Patch store so listsLoaded is true with known content
    const listsBeforeLoad = useAppStore.getState().lists;

    await useAppStore.getState().loadMyDay();

    // Store lists should be identical reference (not re-fetched)
    expect(useAppStore.getState().lists).toBe(listsBeforeLoad);

    // Silence unused-variable warning
    void list;
  });

  it('populates myDayHabits from daily-type lists', async () => {
    const dailyList = await dbCreateList('Morning Routine', 'daily');
    await dbCreateTask(dailyList.id, 'Meditate');
    await dbCreateTask(dailyList.id, 'Exercise');
    await useAppStore.getState().loadLists();

    await useAppStore.getState().loadMyDay();

    const habits = useAppStore.getState().myDayHabits;
    expect(habits).toHaveLength(2);
    const titles = habits.map((h) => h.task.title).sort();
    expect(titles).toEqual(['Exercise', 'Meditate']);
    // streak starts at 0 since no completions have been recorded
    expect(habits.every((h) => h.streak === 0)).toBe(true);
    expect(habits.every((h) => h.completedToday === false)).toBe(true);
  });
});

describe('store: completeTask with rrule', () => {
  it('calls dbAdvanceRecurring instead of dbSetCompleted for rrule tasks', async () => {
    const list = await dbCreateList('Recurring', 'general');
    // Weekly task starting 2026-04-07 (a Tuesday)
    const task = await dbCreateTask(list.id, 'Weekly review', {
      due_date: '2026-04-07',
      rrule: 'FREQ=WEEKLY;INTERVAL=1',
    });
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().completeTask(task.id, list.id, true);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    const updated = tasks.find((t) => t.id === task.id);
    // dbAdvanceRecurring moves due_date to the next occurrence and keeps
    // completed=false (task stays open at the new date)
    expect(updated?.due_date).not.toBe('2026-04-07');
    expect(updated?.completed).toBe(false);
  });

  it('uses dbSetCompleted for a normal (non-rrule) task when completing', async () => {
    const list = await dbCreateList('Normal', 'general');
    const task = await dbCreateTask(list.id, 'One-off task');
    await useAppStore.getState().loadTasks(list.id);

    await useAppStore.getState().completeTask(task.id, list.id, true);

    const tasks = useAppStore.getState().tasksByList[list.id] ?? [];
    const updated = tasks.find((t) => t.id === task.id);
    expect(updated?.completed).toBe(true);
  });
});

describe('store: deleteList side-effects on myDay slices', () => {
  it('removes tasks from myDayOverdue and myDayToday when their list is deleted', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const overdueDate = yesterday.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const list = await dbCreateList('Doomed', 'general');
    const overdueTask = await dbCreateTask(list.id, 'Overdue task', { due_date: overdueDate });
    const todayTask = await dbCreateTask(list.id, 'Today task', { due_date: today });

    // Seed myDayOverdue and myDayToday manually to simulate loaded state
    useAppStore.setState({
      myDayOverdue: [overdueTask],
      myDayToday: [todayTask],
      myDayLoaded: true,
    });
    await useAppStore.getState().loadLists();

    await useAppStore.getState().deleteList(list.id);

    expect(useAppStore.getState().myDayOverdue).toHaveLength(0);
    expect(useAppStore.getState().myDayToday).toHaveLength(0);
  });

  it('does not remove tasks belonging to other lists from myDay slices', async () => {
    const today = new Date().toISOString().slice(0, 10);

    const keepList = await dbCreateList('Keep', 'general');
    const deleteList = await dbCreateList('Delete', 'general');
    const keepTask = await dbCreateTask(keepList.id, 'Keep this', { due_date: today });
    const deleteTask = await dbCreateTask(deleteList.id, 'Delete this', { due_date: today });

    useAppStore.setState({
      myDayToday: [keepTask, deleteTask],
      myDayLoaded: true,
    });
    await useAppStore.getState().loadLists();

    await useAppStore.getState().deleteList(deleteList.id);

    const remaining = useAppStore.getState().myDayToday;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(keepTask.id);
  });
});

describe('store: updateTaskFields side-effects', () => {
  it('calls loadMyDay when myDayLoaded is true', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const list = await dbCreateList('Fields', 'general');
    const task = await dbCreateTask(list.id, 'Scheduled task');
    await useAppStore.getState().loadTasks(list.id);

    // Set myDayLoaded=true so the side-effect path runs
    useAppStore.setState({ myDayLoaded: true });

    await useAppStore.getState().updateTaskFields(task.id, list.id, { due_date: today });

    // loadMyDay is fire-and-forget — flush the microtask/promise queue so it
    // can complete before we read state.
    await new Promise((r) => setTimeout(r, 50));

    // After loadMyDay settles, myDayToday should include the newly-due task
    const todayTasks = useAppStore.getState().myDayToday;
    expect(todayTasks.some((t) => t.id === task.id)).toBe(true);
  });

  it('does not call loadMyDay when myDayLoaded is false', async () => {
    const list = await dbCreateList('Fields2', 'general');
    const task = await dbCreateTask(list.id, 'Unscheduled task');
    await useAppStore.getState().loadTasks(list.id);

    // myDayLoaded starts false (default from reset in beforeEach); confirm
    // before the action so we know the guard condition is unmet.
    const loadedBefore = useAppStore.getState().myDayLoaded;
    expect(loadedBefore).toBe(false);

    await useAppStore.getState().updateTaskFields(task.id, list.id, { due_date: '2030-01-01' });

    // Give any unexpected async work a chance to settle, then verify
    // loadMyDay was NOT triggered (myDayLoaded must still be false).
    await new Promise((r) => setTimeout(r, 50));

    expect(useAppStore.getState().myDayLoaded).toBe(false);
  });
});
