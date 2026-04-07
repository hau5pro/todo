import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { PencilSimple, Trash, CaretDown, CaretRight, CopySimple, List as ListIcon, CheckCircle } from '@phosphor-icons/react';
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion';
import { ease } from '../utils/easing';
import { focusLater } from '../utils/dom';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { TaskItem } from '../components/TaskItem';
import { IconPicker } from '../components/IconPicker';
import { ICON_SIZE } from '../config/icons';
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

function applyOrder(tasks: Task[], order: string[]): Task[] {
  if (order.length === 0) return tasks;
  const map = new Map(tasks.map((t) => [t.id, t]));
  const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  const rest = tasks.filter((t) => !order.includes(t.id));
  return [...rest, ...ordered];
}

function TaskRow({ task, editMode, today, onToggle, onSelect, onDelete, isSelected }: {
  task: Task; editMode: boolean; today: string;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item as="div" value={task} dragListener={false} dragControls={dragControls}
      variants={taskItemVariants}
      className="task-row"
      style={{ cursor: 'default' }}
    >
      <span style={{ width: editMode ? 26 : 0, opacity: editMode ? 1 : 0, overflow: 'hidden', flexShrink: 0, display: 'flex', transition: 'width 0.15s, opacity 0.15s' }}>
        <span className="task-edit-drag" onPointerDown={(e) => dragControls.start(e)}>
          <ListIcon size={ICON_SIZE} weight="bold" />
        </span>
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <TaskItem
          title={task.title}
          completed={task.completed}
          dueDate={task.due_date}
          today={today}
          onToggle={onToggle}
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
        <Trash size={14} weight="fill" />
      </button>
    </Reorder.Item>
  );
}

export function ListView() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const tasks = useAppStore((s) => s.tasksByList[listId!]);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const { renameList, updateListIcon, deleteList, duplicateList, addTask, completeTask, advanceCyclicalTask, removeTask } = useAppStore();

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder, customOrder, setCustomOrder, pinnedOrder } = useSettings();

  const [newTitle, setNewTitle] = useState('');
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [iconPickerAnchor, setIconPickerAnchor] = useState<DOMRect | null>(null);
  const [taskEditMode, setTaskEditMode] = useState(false);
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (tasks === undefined) loadTasks(listId!);
  }, [listId]);

  useEffect(() => {
    setTaskEditMode(false);
  }, [listId]);

  if (!list || tasks === undefined) return null;

  const isPinned = pinnedOrder.includes(listId!);
  const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null).reverse();
  const completedTasks = tasks.filter((t) => t.completed && t.deleted_at === null);
  const orderedActive = applyOrder(activeTasks, listOrders[listId!] ?? []);

  function handleReorder(reordered: Task[]) {
    setListOrder(listId!, reordered.map((t) => t.id));
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
            <button className="view-title-action-btn" onClick={commitEditListName} title="Save"><CheckCircle size={ICON_SIZE} weight="fill" /></button>
          </>
        ) : (
          <>
            {isPinned ? (
              <span className="view-title-icon">
                {getListIcon(list, 20) ?? <ListIcon size={20} weight="fill" />}
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
                {getListIcon(list, 20) ?? <ListIcon size={20} weight="fill" />}
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
                  ? <CheckCircle size={ICON_SIZE} weight="fill" />
                  : <PencilSimple size={ICON_SIZE} weight="fill" />}
              </button>
              {!isPinned && (<>
                <button className="view-title-action-btn" onClick={handleDuplicate} title="Duplicate list"><CopySimple size={ICON_SIZE} weight="fill" /></button>
                <button className="view-title-action-btn view-title-action-btn--danger" onClick={() => setConfirmDeleteList(true)} title="Delete list"><Trash size={ICON_SIZE} weight="fill" /></button>
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
      <motion.form variants={headerItemVariants} onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add task"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          data-add-task
        />
      </motion.form>
      </motion.div>

      <Reorder.Group as="div" axis="y" values={orderedActive} onReorder={handleReorder}
        variants={taskListVariants} initial="hidden" animate="show"
      >
        <AnimatePresence>
          {orderedActive.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              editMode={taskEditMode}
              today={today}
              onToggle={() => handleToggle(task)}
              onSelect={() => handleSelectTask(task)}
              onDelete={() => removeTask(task.id, listId!)}
              isSelected={detail?.task.id === task.id}
            />
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {!taskEditMode && (
        <section>
          <button className="section-collapse-btn" onClick={() => setShowCompleted((p) => !p)}>
            <span className="section-heading" style={{ margin: 0 }}>
              Completed{completedTasks.length > 0 ? ` (${completedTasks.length})` : ''}
            </span>
            {showCompleted
              ? <CaretDown size={ICON_SIZE} weight="fill" />
              : <CaretRight size={ICON_SIZE} weight="fill" />}
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
                <AnimatePresence>
                  {completedTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.15, ease: 'easeIn' as const } }}
                      transition={{ duration: 0.2, ease: 'easeOut' as const }}
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
