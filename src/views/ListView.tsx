import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { PencilSimple, Trash, Check, X, CaretDown, CaretRight, CopySimple, List as ListIcon } from '@phosphor-icons/react';
import { AnimatePresence, motion, Reorder } from 'framer-motion';
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

function applyOrder(tasks: Task[], order: string[]): Task[] {
  if (order.length === 0) return tasks;
  const map = new Map(tasks.map((t) => [t.id, t]));
  const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  const rest = tasks.filter((t) => !order.includes(t.id));
  return [...ordered, ...rest];
}

export function ListView() {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const tasks = useAppStore((s) => s.tasksByList[listId!]);
  const loadTasks = useAppStore((s) => s.loadTasks);
  const { renameList, updateListIcon, deleteList, duplicateList, addTask, completeTask, advanceCyclicalTask } = useAppStore();

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder, customOrder, setCustomOrder, pinnedOrder } = useSettings();

  const [newTitle, setNewTitle] = useState('');
  const [editingListName, setEditingListName] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [iconPickerAnchor, setIconPickerAnchor] = useState<DOMRect | null>(null);
  const listNameInputRef = useRef<HTMLInputElement>(null);
  const iconBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (tasks === undefined) loadTasks(listId!);
  }, [listId]);


  if (!list || tasks === undefined) return null;

  const activeTasks = tasks.filter((t) => !t.completed && t.deleted_at === null);
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
      <div className="view-title-row">
        {editingListName ? (
          <>
            <input
              ref={listNameInputRef}
              className="view-title-input"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEditListName();
                if (e.key === 'Escape') setEditingListName(false);
              }}
            />
            <button className="view-title-action-btn" onClick={commitEditListName} title="Save"><Check size={ICON_SIZE} weight="fill" /></button>
            <button className="view-title-action-btn" onClick={() => setEditingListName(false)} title="Cancel"><X size={ICON_SIZE} weight="fill" /></button>
          </>
        ) : (
          <>
            {pinnedOrder.includes(listId!) ? (
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
            <h1 className="view-title">{list.name}</h1>
            <span className="view-title-actions">
              <button className="view-title-action-btn" onClick={startEditListName} title="Rename list"><PencilSimple size={ICON_SIZE} weight="fill" /></button>
              <button className="view-title-action-btn" onClick={handleDuplicate} title="Duplicate list"><CopySimple size={ICON_SIZE} weight="fill" /></button>
              <button className="view-title-action-btn view-title-action-btn--danger" onClick={() => setConfirmDeleteList(true)} title="Delete list"><Trash size={ICON_SIZE} weight="fill" /></button>
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
      </div>
      <p className="view-subtitle">{list.type === 'general' ? 'tasks' : LIST_TYPE_LABELS[list.type]}</p>
      <form onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add task"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          data-add-task
        />
      </form>

      <Reorder.Group as="div" axis="y" values={orderedActive} onReorder={handleReorder}>
        <AnimatePresence initial={false}>
          {orderedActive.map((task) => (
            <Reorder.Item as="div" key={task.id} value={task}>
              <TaskItem
                title={task.title}
                completed={task.completed}
                dueDate={task.due_date}
                today={today}
                onToggle={() => handleToggle(task)}
                onSelect={() => handleSelectTask(task)}
                isSelected={detail?.task.id === task.id}
              />
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

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
              <AnimatePresence initial={false}>
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    title={task.title}
                    completed={true}
                    dueDate={task.due_date}
                    today={today}
                    onToggle={() => handleToggle(task)}
                    onSelect={() => handleSelectTask(task)}
                    isSelected={detail?.task.id === task.id}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {confirmDeleteList && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteList(false)}>
          <div className="modal-popup" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-popup__title">Delete "{list.name}"?</h3>
            <p className="modal-popup__body">This will permanently delete the list and all its tasks.</p>
            <div className="modal-popup__actions">
              <button className="btn-danger-sm" onClick={executeDeleteList}>Delete</button>
              <button className="btn-ghost-sm" onClick={() => setConfirmDeleteList(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
