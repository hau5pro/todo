import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Copy, List, CheckCircle, Smile, FolderInput } from 'lucide-react';
import { DragHandle, DeleteButton } from '../components/EditControls';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useLineDrag } from '../hooks/useLineDrag';
import { ease } from '../utils/easing';
import { focusLater } from '../utils/dom';
import { applyOrder } from '../utils/order';
import { getTodayString } from '../utils/date';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { TaskItem } from '../components/TaskItem';
import { IconPicker } from '../components/IconPicker';
import { GroupSection } from '../components/GroupSection';
import { ICON_SIZE, COMPLETED_PAGE_SIZE, ADD_TASK_PLACEHOLDER, PINNED_LIST_SUBTITLES } from '../config/constants';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';
import type { Task } from '../types';

const headerVariants = {
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};
const headerItemVariants = {
  hidden: { opacity: 0, y: 5 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
};

function reorderGroupInGlobal(globalOrder: string[], newGroupOrder: string[]): string[] {
  const groupSet = new Set(newGroupOrder);
  const result = [...globalOrder];
  const positions: number[] = [];
  for (let i = 0; i < result.length; i++) {
    if (groupSet.has(result[i])) positions.push(i);
  }
  newGroupOrder.filter((id) => globalOrder.includes(id)).forEach((id, i) => {
    result[positions[i]] = id;
  });
  const missing = newGroupOrder.filter((id) => !globalOrder.includes(id));
  return [...result, ...missing];
}

function TaskRow({
  task, editMode, today, dragging,
  onToggle, onSelect, onDelete, isSelected, onReorderStart, onGroupDragStart,
}: {
  task: Task; editMode: boolean; today: string; dragging: boolean;
  onToggle: (id: string) => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
  onGroupDragStart?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: 'default', opacity: dragging ? 0.4 : 1 }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
        {editMode && <span className="nav-item-drag-zone-divider" />}
        {editMode && (
          <span
            className="task-edit-drag"
            title="Drag to move to group"
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onGroupDragStart?.(e);
            }}
          >
            <FolderInput size={ICON_SIZE} />
          </span>
        )}
        {editMode && <span className="nav-item-drag-zone-divider" />}
        <DeleteButton show={editMode} onClick={onDelete} title="Delete task" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <TaskItem
          id={task.id}
          title={task.title}
          completed={task.completed}
          dueDate={task.due_date}
          dueTime={task.due_time}
          today={today}
          onToggle={editMode ? undefined : onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
      </div>
    </div>
  );
}

export function ListView() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const today = useMemo(() => getTodayString(), []);

  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const tasks = useAppStore((s) => s.tasksByList[listId!]);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const { renameList, updateListIcon, deleteList, duplicateList, addTask, completeTask, advanceCyclicalTask, removeTask, moveTaskToGroup, renameGroup, deleteGroup } = useAppStore();

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder, listGroupOrders, setListGroupOrder, customOrder, setCustomOrder, pinnedOrder } = useSettings();

  const [newTitle, setNewTitle] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedVisible, setCompletedVisible] = useState(COMPLETED_PAGE_SIZE);
  const completedSentinelRef = useRef<HTMLDivElement>(null);
  const [iconPickerAnchor, setIconPickerAnchor] = useState<DOMRect | null>(null);
  const [taskEditMode, setTaskEditMode] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLElement>(null);
  const groupDragTargetRef = useRef<string | null>(null);
  const groupGhostRef = useRef<HTMLDivElement>(null);
  const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
    scrollRef,
    onCommit: (_id, context, newIds) => {
      if (context === 'ungrouped') {
        setListOrder(listId!, newIds);
      } else if (context === 'groups') {
        setListGroupOrder(listId!, newIds);
      } else {
        setListOrder(listId!, reorderGroupInGlobal(globalOrder, newIds));
      }
    },
  });

  useEffect(() => {
    if (tasks === undefined) loadTasks(listId!);
  }, [listId]);

  useEffect(() => {
    setTaskEditMode(false);
    setEditingListName(false);
    setCompletedVisible(COMPLETED_PAGE_SIZE);
    setAddOpen(false);
  }, [listId]);

  useEffect(() => {
    if (!showCompleted) return;
    const sentinel = completedSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setCompletedVisible((v) => v + COMPLETED_PAGE_SIZE);
        }
      },
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [showCompleted, completedVisible]);

  // Pointer-based cross-group drag
  useEffect(() => {
    if (!draggingTaskId) return;
    const taskId = draggingTaskId;

    function highlight(id: string | null) {
      if (!id) return;
      const cls = id === '__ungrouped__' ? 'ungrouped-drop-zone--active' : 'group-section--drag-over';
      document.querySelector(`[data-group-id="${id}"]`)?.classList.add(cls);
    }
    function unhighlight(id: string | null) {
      if (!id) return;
      const cls = id === '__ungrouped__' ? 'ungrouped-drop-zone--active' : 'group-section--drag-over';
      document.querySelector(`[data-group-id="${id}"]`)?.classList.remove(cls);
    }

    function onMove(e: PointerEvent) {
      if (groupGhostRef.current) {
        groupGhostRef.current.style.display = 'flex';
        groupGhostRef.current.style.left = `${e.clientX + 12}px`;
        groupGhostRef.current.style.top = `${e.clientY + 12}px`;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const groupEl = el?.closest('[data-group-id]');
      const newTarget = groupEl?.getAttribute('data-group-id') ?? null;
      if (newTarget !== groupDragTargetRef.current) {
        unhighlight(groupDragTargetRef.current);
        highlight(newTarget);
        groupDragTargetRef.current = newTarget;
      }
    }

    function cleanup() {
      unhighlight(groupDragTargetRef.current);
      groupDragTargetRef.current = null;
      if (groupGhostRef.current) groupGhostRef.current.style.display = 'none';
    }

    function onUp() {
      const target = groupDragTargetRef.current;
      cleanup();
      if (target === '__ungrouped__') moveTaskToGroup(taskId, listId!, null);
      else if (target) moveTaskToGroup(taskId, listId!, target);
      setDraggingTaskId(null);
    }

    function onCancel() { cleanup(); setDraggingTaskId(null); }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanup();
    };
  }, [draggingTaskId]);

  // Auto-sync group order: add any new groups that appear in tasks
  useEffect(() => {
    if (!tasks) return;
    const activeGroups = [...new Set(
      tasks.filter((t) => t.group && !t.deleted_at).map((t) => t.group!)
    )];
    const saved = listGroupOrders[listId!] ?? [];
    const newOnes = activeGroups.filter((g) => !saved.includes(g));
    if (newOnes.length > 0) {
      setListGroupOrder(listId!, [...saved, ...newOnes]);
    }
  }, [tasks, listId]);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const handleToggle = useCallback(async (id: string) => {
    const task = tasksRef.current?.find((t) => t.id === id);
    if (!task) return;
    if (task.recurrence_interval) {
      await advanceCyclicalTask(task.id, listId!);
    } else {
      await completeTask(task.id, listId!, !task.completed);
    }
  }, [advanceCyclicalTask, completeTask, listId]);

  if (!list || tasks === undefined) return null;

  const isPinned = pinnedOrder.includes(listId!);
  const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null).reverse();
  const completedTasks = tasks
    .filter((t) => t.completed && t.deleted_at === null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const visibleCompleted = completedTasks.slice(0, completedVisible);
  const globalOrder = listOrders[listId!] ?? [];
  const orderedActive = applyOrder(activeTasks, globalOrder, (t) => t.id);

  const ungroupedTasks = orderedActive.filter((t) => !t.group);
  const groupMap = new Map<string, Task[]>();
  for (const task of orderedActive) {
    if (task.group) {
      if (!groupMap.has(task.group)) groupMap.set(task.group, []);
      groupMap.get(task.group)!.push(task); // safe: set above if absent
    }
  }

  const savedGroupOrder = listGroupOrders[listId!] ?? [];
  const allGroupNames = [
    ...savedGroupOrder.filter((g) => groupMap.has(g)),
    ...Array.from(groupMap.keys()).filter((g) => !savedGroupOrder.includes(g)),
  ];

  const ghostTask = dragId ? activeTasks.find((t) => t.id === dragId) : null;
  const ghostLabel = ghostTask?.title ?? (dragId && allGroupNames.includes(dragId) ? dragId : null);
  const groupDragTask = draggingTaskId ? activeTasks.find((t) => t.id === draggingTaskId) : null;

  async function commitAdd() {
    if (!newTitle.trim() || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await addTask(listId!, newTitle.trim());
      setNewTitle('');
      setAddOpen(false);
      closeDetail();
    } finally {
      submittingRef.current = false;
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await commitAdd();
  }

  function startEditListName() {
    if (!list) return;
    setNewListName(list.name);
    setEditingListName(true);
    setTaskEditMode(false);
    focusLater(listNameInputRef);
  }

  async function commitEditListName() {
    const name = newListName.trim();
    if (name && list && name !== list.name) await renameList(listId!, name);
    setEditingListName(false);
  }

  async function executeDeleteList() {
    await deleteList(listId!);
    closeDetail();
    navigate('/');
  }

  async function handleDuplicate() {
    const newList = await duplicateList(listId!);
    setCustomOrder([...customOrder, newList.id]);
    navigate(`/list/${newList.id}`);
  }

  function handleSelectTask(task: typeof tasks[0]) {
    if (detail?.task.id === task.id) {
      closeDetail();
    } else {
      openDetail({ task });
    }
  }

  async function handleRenameGroup(oldName: string, newName: string) {
    await renameGroup(listId!, oldName, newName);
    const current = listGroupOrders[listId!] ?? [];
    setListGroupOrder(listId!, current.map((g) => (g === oldName ? newName : g)));
  }

  async function handleDeleteGroup(name: string) {
    await deleteGroup(listId!, name);
    const current = listGroupOrders[listId!] ?? [];
    setListGroupOrder(listId!, current.filter((g) => g !== name));
  }


  return (
    <>
      {ghostLabel !== null && createPortal(
        <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {ghostLabel}
        </div>,
        document.body
      )}
      {createPortal(
        <div ref={lineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
        document.body
      )}
      {groupDragTask && createPortal(
        <div ref={groupGhostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {groupDragTask.title}
        </div>,
        document.body
      )}
    <div>
      <motion.div variants={headerVariants} initial="hidden" animate="show" className="view-header">
        <motion.div variants={headerItemVariants} className="view-title-row">
          <span className="view-title-icon">
            {getListIcon(list, 20) ?? <List size={20} />}
          </span>
          {editingListName ? (
            <>
              <input
                ref={listNameInputRef}
                className="view-title-input"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onBlur={commitEditListName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEditListName();
                  if (e.key === 'Escape') setEditingListName(false);
                }}
              />
              <button className="view-title-action-btn" onClick={commitEditListName} title="Save"><CheckCircle size={ICON_SIZE} /></button>
            </>
          ) : (
            <>
              <h1 className="view-title" onClick={!isPinned ? startEditListName : undefined} style={!isPinned ? { cursor: 'text' } : undefined}>{list.name}</h1>
              <span className="view-title-actions">
                <button
                  className="view-title-action-btn"
                  onClick={() => { if (editingListName) setEditingListName(false); setTaskEditMode((m) => !m); }}
                  title={taskEditMode ? 'Done editing' : 'Edit tasks'}
                  style={taskEditMode ? { color: 'var(--success)' } : undefined}
                >
                  {taskEditMode ? <CheckCircle size={ICON_SIZE} /> : <Pencil size={ICON_SIZE} />}
                </button>
                {!isPinned && (<>
                  <button className="view-title-action-btn" onClick={handleDuplicate} title="Duplicate list"><Copy size={ICON_SIZE} /></button>
                  <button
                    ref={iconBtnRef}
                    className={`view-title-action-btn${iconPickerAnchor ? ' view-title-action-btn--open' : ''}`}
                    onClick={() => {
                      if (iconPickerAnchor) { setIconPickerAnchor(null); return; }
                      if (iconBtnRef.current) setIconPickerAnchor(iconBtnRef.current.getBoundingClientRect());
                    }}
                    title="Change icon"
                    aria-label="Change icon"
                    aria-expanded={!!iconPickerAnchor}
                  >
                    <Smile size={ICON_SIZE} />
                  </button>
                  <AnimatePresence>
                    {iconPickerAnchor && (
                      <IconPicker
                        currentIcon={list.icon}
                        anchorRect={iconPickerAnchor}
                        onSelect={(icon) => updateListIcon(listId!, icon)}
                        onClose={() => setIconPickerAnchor(null)}
                      />
                    )}
                  </AnimatePresence>
                  <button className="view-title-action-btn view-title-action-btn--danger" onClick={() => setConfirmDeleteList(true)} title="Delete list"><Trash2 size={ICON_SIZE} /></button>
                </>)}
              </span>
            </>
          )}
        </motion.div>
        <motion.p variants={headerItemVariants} className="view-subtitle">
          {PINNED_LIST_SUBTITLES[list.name] ?? (list.type === 'general' ? 'tasks' : LIST_TYPE_LABELS[list.type])}
        </motion.p>
      </motion.div>

      <div className="view-body">
      {/* Ungrouped tasks + add task — unified drop zone to remove group assignment */}
      <div
        data-group-id="__ungrouped__"
        className={[
          'ungrouped-drop-zone',
          taskEditMode ? 'ungrouped-drop-zone--editing' : '',
          draggingTaskId ? 'ungrouped-drop-zone--dragging' : '',
        ].filter(Boolean).join(' ')}
      >
        <motion.form
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.21 }}
          onSubmit={handleAdd}
          style={{ position: 'relative' }}
        >
          <AnimatePresence initial={false}>
            {!addOpen && (
              <motion.button
                key="add-trigger"
                type="button"
                className="add-task"
                onClick={() => { setAddOpen(true); focusLater(addInputRef); }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                style={{ position: 'absolute', inset: 0, margin: 0, height: '100%' }}
              >
                {ADD_TASK_PLACEHOLDER}
              </motion.button>
            )}
          </AnimatePresence>
          <input
            ref={addInputRef}
            className="add-task-input"
            placeholder={ADD_TASK_PLACEHOLDER}
            aria-label="Add task"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onFocus={() => setAddOpen(true)}
            onBlur={() => {
              if (!newTitle.trim()) setAddOpen(false);
              else commitAdd();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setNewTitle(''); setAddOpen(false); }
            }}
            data-add-task
            style={{
              opacity: addOpen ? 1 : 0,
              transition: 'opacity 0.12s ease',
              pointerEvents: addOpen ? 'auto' : 'none',
            }}
          />
        </motion.form>
        <div data-reorder-context="ungrouped">
          <AnimatePresence initial={false}>
            {ungroupedTasks.map((task) => (
              <motion.div
                key={task.id}
                data-reorder-id={task.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto', transition: { duration: 0.22, ease: ease.snap } }}
                exit={{ opacity: 0, height: 0, pointerEvents: 'none', transition: { duration: 0.18, ease: ease.in } }}
                style={{ overflow: 'hidden' }}
              >
                <TaskRow
                  task={task}
                  editMode={taskEditMode}
                  today={today}
                  dragging={task.id === draggingTaskId}
                  onToggle={handleToggle}
                  onSelect={() => handleSelectTask(task)}
                  onDelete={() => removeTask(task.id, listId!)}
                  isSelected={detail?.task.id === task.id}
                  onReorderStart={(e) => startDrag(e, task.id, 'ungrouped', 'task-row--dragging')}
                  onGroupDragStart={(e) => { e.preventDefault(); setDraggingTaskId(task.id); }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Group sections */}
      <div data-reorder-context="groups">
        {allGroupNames.map((groupName) => (
          <GroupSection
            key={groupName}
            groupName={groupName}
            tasks={groupMap.get(groupName) ?? []}
            editMode={taskEditMode}
            today={today}
            draggingTaskId={draggingTaskId}
            onToggle={handleToggle}
            onSelect={handleSelectTask}
            onDelete={(task) => removeTask(task.id, listId!)}
            onRename={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onGroupDragStart={(e, taskId) => { e.preventDefault(); setDraggingTaskId(taskId); }}
            selectedTaskId={detail?.task.id}
            startDrag={startDrag}
          />
        ))}
      </div>

      {!taskEditMode && (
        <section>
          <button className="section-collapse-btn" onClick={() => setShowCompleted((p) => !p)} aria-expanded={showCompleted}>
            <span className="section-heading" style={{ margin: 0 }}>
              Completed{completedTasks.length > 0 ? ` (${completedTasks.length})` : ''}
            </span>
            {showCompleted
              ? <ChevronDown size={ICON_SIZE} />
              : <ChevronRight size={ICON_SIZE} />}
          </button>
          <AnimatePresence>
            {showCompleted && (
              <motion.div
                key="completed-list"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: ease.out }}
                style={{ overflow: 'hidden' }}
              >
                <AnimatePresence initial={false}>
                  {visibleCompleted.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto', transition: { duration: 0.22, ease: ease.snap } }}
                      exit={{ opacity: 0, height: 0, transition: { duration: 0.18, ease: ease.in } }}
                      style={{ overflow: 'hidden' }}
                    >
                      <TaskItem
                        id={task.id}
                        title={task.title}
                        completed={true}
                        dueDate={task.due_date}
                        dueTime={task.due_time}
                        today={today}
                        onToggle={handleToggle}
                        onSelect={() => handleSelectTask(task)}
                        isSelected={detail?.task.id === task.id}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {completedVisible < completedTasks.length && (
                  <div ref={completedSentinelRef} style={{ height: 1 }} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
      </div>

      <AnimatePresence>
        {confirmDeleteList && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setConfirmDeleteList(false)}
          >
            <motion.div
              className="modal-popup"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="modal-popup__title">Delete "{list.name}"?</h3>
              <p className="modal-popup__body">This will permanently delete the list and all its tasks.</p>
              <div className="modal-popup__actions">
                <button className="btn-danger-sm" onClick={executeDeleteList}>Delete</button>
                <button className="btn-ghost-sm" onClick={() => setConfirmDeleteList(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
