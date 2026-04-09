import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Pencil, CheckCircle } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import { DragHandle, DeleteButton } from '../components/EditControls';

const habitListVariants = {
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};
const habitItemVariants = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' as const } },
};
import { useHabits } from '../hooks/useHabits';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { requestSync } from '../sync/orchestrator';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import type { HabitRow } from '../hooks/useHabits';
import { applyOrder } from '../utils/order';

function HabitRow({ row, editMode, onToggle, onSelect, onDelete, isSelected }: {
  row: HabitRow; editMode: boolean;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item as="div" value={row} dragListener={false} dragControls={dragControls}
      variants={habitItemVariants}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: 'default' }}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} dragControls={dragControls} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <HabitItem
          title={row.task.title}
          completedToday={row.completedToday}
          streak={row.streak}
          onToggle={onToggle}
          onSelect={editMode ? undefined : onSelect}
          isSelected={!editMode && isSelected}
        />
      </div>
      <DeleteButton show={editMode} onClick={onDelete} title="Delete habit" />
    </Reorder.Item>
  );
}

export function DailyView() {
  const { listId } = useParams<{ listId: string }>();
  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  const addTask = useAppStore((s) => s.addTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const { rows, isLoading, reload, today } = useHabits(listId!);
  const [newTitle, setNewTitle] = useState('');
  const [habitEditMode, setHabitEditMode] = useState(false);

  const { detail, open: openDetail, close: closeDetail } = useTaskDetail();
  const { listOrders, setListOrder } = useSettings();
  const prevDetail = useRef(detail);
  useEffect(() => {
    if (prevDetail.current !== null && detail === null) reload();
    prevDetail.current = detail;
  }, [detail]);

  useEffect(() => {
    setHabitEditMode(false);
  }, [listId]);

  if (isLoading) return null;

  const orderedRows = applyOrder(rows, listOrders[listId!] ?? [], (r) => r.task.id);

  function handleReorder(reordered: typeof rows) {
    setListOrder(listId!, reordered.map((r) => r.task.id));
  }

  async function handleToggle(taskId: string) {
    await toggleHabitCompletion(taskId, today);
    reload();
    requestSync();
  }

  async function commitAdd() {
    if (!newTitle.trim()) return;
    await addTask(listId!, newTitle.trim());
    setNewTitle('');
    reload();
    closeDetail();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await commitAdd();
  }

  return (
    <div>
      <div className="view-header">
        {list && getListIcon(list, 20) && <span className="view-title-icon">{getListIcon(list, 20)}</span>}
        <div className="view-title-row">
          <h1 className="view-title">{list?.name ?? 'Habits'}</h1>
          <span className="view-title-actions">
            <button
              className="view-title-action-btn"
              onClick={() => setHabitEditMode((m) => !m)}
              title={habitEditMode ? 'Done editing' : 'Edit habits'}
              style={habitEditMode ? { color: 'var(--success)' } : undefined}
            >
              {habitEditMode
                ? <CheckCircle size={ICON_SIZE} />
                : <Pencil size={ICON_SIZE} />}
            </button>
          </span>
        </div>
        <p className="view-subtitle">{list ? LIST_TYPE_LABELS[list.type] : 'daily'}</p>
      </div>
      <div className="view-body">
      <form onSubmit={handleAdd}>
        <input
          className="add-task-input"
          placeholder="+ Add habit"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onBlur={commitAdd}
        />
      </form>
      <Reorder.Group as="div" axis="y" values={orderedRows} onReorder={handleReorder}
        variants={habitListVariants} initial="hidden" animate="show"
      >
        {orderedRows.map((row) => (
          <HabitRow
            key={row.task.id}
            row={row}
            editMode={habitEditMode}
            onToggle={() => handleToggle(row.task.id)}
            onSelect={() => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
            onDelete={() => removeTask(row.task.id, listId!).then(reload)}
            isSelected={detail?.task.id === row.task.id}
          />
        ))}
      </Reorder.Group>
      </div>
    </div>
  );
}
