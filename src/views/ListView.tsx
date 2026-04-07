import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Copy, List, CheckCircle, MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { ease } from '../utils/easing';
import { focusLater } from '../utils/dom';
import { applyOrder } from '../utils/order';
import { getTodayString } from '../utils/date';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { TaskItem } from '../components/TaskItem';
import { IconPicker } from '../components/IconPicker';
import { ICON_SIZE, COMPLETED_PAGE_SIZE, ADD_TASK_PLACEHOLDER } from '../config/constants';
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
const taskListVariants = {
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.16 } },
};
const taskItemVariants = {
  hidden: { opacity: 0, y: -10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const, delay: 0.05 } },
  exit:   { opacity: 0, transition: { duration: 0.15, ease: 'easeIn' as const } },
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
  task, editMode, today, dragging, onDragStart, onDragEnd,
  onToggle, onSelect, onDelete, isSelected,
}: {
  task: Task; editMode: boolean; today: string; dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={task}
      dragListener={false}
      dragControls={dragControls}
      variants={taskItemVariants}
      className="task-row"
      style={{ cursor: editMode ? 'grab' : 'default', opacity: dragging ? 0.4 : 1 }}
      transition={{ layout: { duration: 0.08, ease: 'easeOut' } }}
    >
      <span style={{ width: editMode ? 26 : 0, opacity: editMode ? 1 : 0, overflow: 'hidden', flexShrink: 0, display: 'flex', transition: 'width 0.15s, opacity 0.15s' }}>
        <span className="task-edit-drag" title="Drag to reorder" onPointerDown={(e) => dragControls.start(e)}>
          <List size={ICON_SIZE} />
        </span>
      </span>
      {/* Wrap content in a draggable div so it doesn't conflict with FM's onDragStart typing */}
      <div
        style={{ flex: 1, minWidth: 0 }}
        title={editMode ? 'Drag to move to group' : undefined}
        draggable={editMode}
        onDragStart={editMode ? (e) => {
          const ghost = document.createElement('div');
          ghost.className = 'task-drag-ghost';
          ghost.textContent = task.title;
          document.body.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 0, 0);
          requestAnimationFrame(() => document.body.removeChild(ghost));
          onDragStart(e);
        } : undefined}
        onDragEnd={editMode ? onDragEnd : undefined}
      >
        <TaskItem
          title={task.title}
          completed={task.completed}
          dueDate={task.due_date}
          today={today}
          onToggle={editMode ? undefined : onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
      </div>
      <button
        className="task-edit-delete"
        onClick={onDelete}
        title="Delete task"
        style={{ width: editMode ? 24 : 0, opacity: editMode ? 1 : 0, overflow: 'hidden', transition: 'width 0.15s, opacity 0.15s' }}
      >
        <Trash2 size={14} />
      </button>
    </Reorder.Item>
  );
}

function GroupSection({
  groupName, tasks, editMode, today, listId, globalOrder, draggingTaskId,
  onReorder, onToggle, onSelect, onDelete, onRename, onDeleteGroup, onTaskDragStart, onTaskDragEnd, selectedTaskId,
}: {
  groupName: string;
  tasks: Task[];
  editMode: boolean;
  today: string;
  listId: string;
  globalOrder: string[];
  draggingTaskId: string | null;
  onReorder: (newGlobalOrder: string[]) => void;
  onToggle: (task: Task) => void;
  onSelect: (task: Task) => void;
  onDelete: (task: Task) => void;
  onRename: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string) => void;
  onTaskDragStart: (taskId: string) => void;
  onTaskDragEnd: () => void;
  selectedTaskId: string | undefined;
}) {
  const { moveTaskToGroup } = useAppStore();
  const dragControls = useDragControls();
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(groupName);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function startEditName() {
    setNameValue(groupName);
    setEditingName(true);
    setMenuOpen(false);
    focusLater(nameInputRef);
  }

  function commitEditName() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== groupName) onRename(groupName, trimmed);
    setEditingName(false);
  }

  function handleGroupReorder(reordered: Task[]) {
    onReorder(reorderGroupInGlobal(globalOrder, reordered.map((t) => t.id)));
  }

  function handleDragOver(e: React.DragEvent) {
    if (!draggingTaskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) await moveTaskToGroup(taskId, listId, groupName);
  }

  return (
    <Reorder.Item
      as="div"
      value={groupName}
      dragListener={false}
      dragControls={dragControls}
      className={[
        'group-section',
        draggingTaskId ? 'group-section--dragging' : '',
        isDragOver ? 'group-section--drag-over' : '',
      ].filter(Boolean).join(' ')}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="group-header">
        <span style={{ width: editMode ? 26 : 0, opacity: editMode ? 1 : 0, overflow: 'hidden', flexShrink: 0, display: 'flex', transition: 'width 0.15s, opacity 0.15s' }}>
          <span className="task-edit-drag" onPointerDown={(e) => dragControls.start(e)}>
            <List size={ICON_SIZE} />
          </span>
        </span>
        <button
          className="group-header-collapse"
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        </button>

        {editingName ? (
          <input
            ref={nameInputRef}
            className="group-header-name-input"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitEditName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEditName();
              if (e.key === 'Escape') setEditingName(false);
            }}
          />
        ) : (
          <span className="group-header-name" onClick={() => setCollapsed((p) => !p)}>{groupName} <span className="group-header-count">({tasks.length})</span></span>
        )}

        <div className="group-header-menu" ref={menuRef}>
          <button
            className="group-header-menu-btn"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Group actions"
          >
            <MoreHorizontal size={16} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="group-header-dropdown"
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.1 }}
              >
                <button className="group-header-dropdown-item" onClick={startEditName}>
                  <Pencil size={13} /> Rename
                </button>
                <button
                  className="group-header-dropdown-item group-header-dropdown-item--danger"
                  onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                >
                  <Trash2 size={13} /> Delete group
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          className="task-edit-delete"
          onClick={() => setConfirmDelete(true)}
          title="Delete group"
          style={{ width: editMode ? 24 : 0, opacity: editMode ? 1 : 0, overflow: 'hidden', transition: 'width 0.15s, opacity 0.15s' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="group-section__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: ease.out }}
            style={{ overflow: 'hidden' }}
          >
            <Reorder.Group as="div" axis="y" values={tasks} onReorder={handleGroupReorder}
              variants={taskListVariants} initial="hidden" animate="show"
            >
              <AnimatePresence>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    editMode={editMode}
                    today={today}
                    dragging={task.id === draggingTaskId}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', task.id);
                      onTaskDragStart(task.id);
                    }}
                    onDragEnd={onTaskDragEnd}
                    onToggle={() => onToggle(task)}
                    onSelect={() => onSelect(task)}
                    onDelete={() => onDelete(task)}
                    isSelected={selectedTaskId === task.id}
                  />
                ))}
              </AnimatePresence>
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setConfirmDelete(false)}
          >
            <motion.div
              className="modal-popup"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="modal-popup__title">Delete "{groupName}"?</h3>
              <p className="modal-popup__body">Items will be moved to the main list, not deleted.</p>
              <div className="modal-popup__actions">
                <button className="btn-danger-sm" onClick={() => { onDeleteGroup(groupName); setConfirmDelete(false); }}>Delete group</button>
                <button className="btn-ghost-sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
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
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedVisible, setCompletedVisible] = useState(COMPLETED_PAGE_SIZE);
  const completedSentinelRef = useRef<HTMLDivElement>(null);
  const [iconPickerAnchor, setIconPickerAnchor] = useState<DOMRect | null>(null);
  const [taskEditMode, setTaskEditMode] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [ungroupedDragOver, setUngroupedDragOver] = useState(false);
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (tasks === undefined) loadTasks(listId!);
  }, [listId]);

  useEffect(() => {
    setTaskEditMode(false);
    setCompletedVisible(COMPLETED_PAGE_SIZE);
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

  if (!list || tasks === undefined) return null;

  const isPinned = pinnedOrder.includes(listId!);
  const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null).reverse();
  const completedTasks = tasks
    .filter((t) => t.completed && t.deleted_at === null)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const visibleCompleted = completedTasks.slice(0, completedVisible);
  const orderedActive = applyOrder(activeTasks, listOrders[listId!] ?? [], (t) => t.id);

  const ungroupedTasks = orderedActive.filter((t) => !t.group);
  const groupMap = new Map<string, Task[]>();
  for (const task of orderedActive) {
    if (task.group) {
      if (!groupMap.has(task.group)) groupMap.set(task.group, []);
      groupMap.get(task.group)!.push(task);
    }
  }

  const savedGroupOrder = listGroupOrders[listId!] ?? [];
  const allGroupNames = [
    ...savedGroupOrder.filter((g) => groupMap.has(g)),
    ...Array.from(groupMap.keys()).filter((g) => !savedGroupOrder.includes(g)),
  ];

  const globalOrder = listOrders[listId!] ?? [];

  function handleReorder(reordered: Task[]) {
    setListOrder(listId!, reordered.map((t) => t.id));
  }

  function handleGroupReorder(newGlobalOrder: string[]) {
    setListOrder(listId!, newGlobalOrder);
  }

  async function handleToggle(task: typeof tasks[0]) {
    if (task.recurrence_interval) {
      await advanceCyclicalTask(task.id, listId!);
    } else {
      await completeTask(task.id, listId!, !task.completed);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await addTask(listId!, newTitle.trim());
    setNewTitle('');
    closeDetail();
  }

  function startEditListName() {
    setNewListName(list!.name);
    setEditingListName(true);
    focusLater(listNameInputRef);
  }

  async function commitEditListName() {
    const name = newListName.trim();
    if (name && name !== list!.name) await renameList(listId!, name);
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

  // Ungrouped drop zone handlers
  function handleUngroupedDragOver(e: React.DragEvent) {
    if (!draggingTaskId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setUngroupedDragOver(true);
  }

  function handleUngroupedDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setUngroupedDragOver(false);
    }
  }

  async function handleUngroupedDrop(e: React.DragEvent) {
    e.preventDefault();
    setUngroupedDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) await moveTaskToGroup(taskId, listId!, null);
  }

  function handleTaskDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDraggingTaskId(taskId);
  }

  return (
    <div>
      <motion.div variants={headerVariants} initial="hidden" animate="show">
      <motion.div variants={headerItemVariants} className="view-title-row">
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
            {isPinned ? (
              <span className="view-title-icon">
                {getListIcon(list, 20) ?? <List size={20} />}
              </span>
            ) : (
              <button
                ref={iconBtnRef}
                className={`view-title-icon-btn${iconPickerAnchor ? ' view-title-icon-btn--open' : ''}`}
                onClick={() => iconPickerAnchor
                  ? setIconPickerAnchor(null)
                  : setIconPickerAnchor(iconBtnRef.current!.getBoundingClientRect())
                }
                title="Change icon"
                aria-label="Change icon"
                aria-expanded={!!iconPickerAnchor}
              >
                {getListIcon(list, 20) ?? <List size={20} />}
              </button>
            )}
            <h1 className="view-title" onClick={!isPinned ? startEditListName : undefined} style={!isPinned ? { cursor: 'text' } : undefined}>{list.name}</h1>
            <span className="view-title-actions">
              <button
                className="view-title-action-btn"
                onClick={() => setTaskEditMode((m) => !m)}
                title={taskEditMode ? 'Done editing' : 'Edit tasks'}
                style={taskEditMode ? { color: 'var(--success)' } : undefined}
              >
                {taskEditMode
                  ? <CheckCircle size={ICON_SIZE} />
                  : <Pencil size={ICON_SIZE} />}
              </button>
              {!isPinned && (<>
                <button className="view-title-action-btn" onClick={handleDuplicate} title="Duplicate list"><Copy size={ICON_SIZE} /></button>
                <button className="view-title-action-btn view-title-action-btn--danger" onClick={() => setConfirmDeleteList(true)} title="Delete list"><Trash2 size={ICON_SIZE} /></button>
              </>)}
            </span>
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
          </>
        )}
      </motion.div>
      <motion.p variants={headerItemVariants} className="view-subtitle">
        {list.type === 'general' ? 'tasks' : LIST_TYPE_LABELS[list.type]}
      </motion.p>
      </motion.div>

      {/* Ungrouped tasks + add task — unified drop zone to remove group assignment */}
      <div
        className={[
          'ungrouped-drop-zone',
          draggingTaskId ? 'ungrouped-drop-zone--dragging' : '',
          ungroupedDragOver ? 'ungrouped-drop-zone--active' : '',
        ].filter(Boolean).join(' ')}
        onDragOver={handleUngroupedDragOver}
        onDragLeave={handleUngroupedDragLeave}
        onDrop={handleUngroupedDrop}
      >
        <motion.form
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.21 }}
          onSubmit={handleAdd}
        >
          <input
            className="add-task-input"
            placeholder={ADD_TASK_PLACEHOLDER}
            aria-label="Add task"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            data-add-task
          />
        </motion.form>
        <Reorder.Group as="div" axis="y" values={ungroupedTasks} onReorder={handleReorder}
          variants={taskListVariants} initial="hidden" animate="show"
        >
          <AnimatePresence>
            {ungroupedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                editMode={taskEditMode}
                today={today}
                dragging={task.id === draggingTaskId}
                onDragStart={(e) => handleTaskDragStart(e, task.id)}
                onDragEnd={() => setDraggingTaskId(null)}
                onToggle={() => handleToggle(task)}
                onSelect={() => handleSelectTask(task)}
                onDelete={() => removeTask(task.id, listId!)}
                isSelected={detail?.task.id === task.id}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      </div>

      {/* Group sections */}
      <Reorder.Group as="div" axis="y" values={allGroupNames} onReorder={(names) => setListGroupOrder(listId!, names)}>
        {allGroupNames.map((groupName) => (
          <GroupSection
            key={groupName}
            groupName={groupName}
            tasks={groupMap.get(groupName) ?? []}
            editMode={taskEditMode}
            today={today}
            listId={listId!}
            globalOrder={globalOrder}
            draggingTaskId={draggingTaskId}
            onReorder={handleGroupReorder}
            onToggle={handleToggle}
            onSelect={handleSelectTask}
            onDelete={(task) => removeTask(task.id, listId!)}
            onRename={handleRenameGroup}
            onDeleteGroup={handleDeleteGroup}
            onTaskDragStart={(taskId) => setDraggingTaskId(taskId)}
            onTaskDragEnd={() => setDraggingTaskId(null)}
            selectedTaskId={detail?.task.id}
          />
        ))}
      </Reorder.Group>

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
                      exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeIn' as const } }}
                    >
                      <TaskItem
                        title={task.title}
                        completed={true}
                        dueDate={task.due_date}
                        today={today}
                        onToggle={() => handleToggle(task)}
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
  );
}
