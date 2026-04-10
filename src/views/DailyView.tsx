import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, CheckCircle, ChevronDown, ChevronRight, MoreHorizontal, Trash2, FolderInput } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DragHandle, DeleteButton } from '../components/EditControls';
import { useHabits } from '../hooks/useHabits';
import { useLineDrag } from '../hooks/useLineDrag';
import { useAppStore } from '../store';
import { useTaskDetail } from '../contexts/TaskDetailContext';
import { useSettings } from '../contexts/SettingsContext';
import { HabitItem } from '../components/HabitItem';
import { toggleHabitCompletion } from '../db/habits';
import { requestSync } from '../sync/orchestrator';
import { LIST_TYPE_LABELS } from '../types';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import { focusLater } from '../utils/dom';
import { ease } from '../utils/easing';
import type { HabitRow } from '../hooks/useHabits';
import { applyOrder } from '../utils/order';

function HabitRow({ row, editMode, onToggle, onSelect, onDelete, isSelected, onReorderStart, onGroupDragStart }: {
  row: HabitRow; editMode: boolean;
  onToggle: () => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
  onGroupDragStart?: (e: React.PointerEvent) => void;
}) {
  return (
    <div
      data-reorder-id={row.task.id}
      className={`task-row${editMode ? ' task-row--editing' : ''}`}
      style={{ cursor: 'default' }}
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
        <DeleteButton show={editMode} onClick={onDelete} title="Delete habit" />
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
    </div>
  );
}

export function HabitGroupSection({
  groupName, rows, editMode,
  startDrag, onGroupDragStart, onToggle, onSelect, onDelete, onRename, onDeleteGroup, selectedTaskId,
}: {
  groupName: string;
  rows: HabitRow[];
  editMode: boolean;
  startDrag: (e: React.PointerEvent, id: string, context: string, cls?: string) => void;
  onGroupDragStart: (e: React.PointerEvent, taskId: string) => void;
  onToggle: (row: HabitRow) => void;
  onSelect: (row: HabitRow) => void;
  onDelete: (row: HabitRow) => void;
  onRename: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string) => void;
  selectedTaskId: string | undefined;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(groupName);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  return (
    <div
      data-reorder-id={groupName}
      data-group-id={groupName}
      className="group-section"
    >
      <div className={`group-header${editMode ? ' group-header--editing' : ''}`}>
        <div className="nav-item-drag-zone">
          <DragHandle show={editMode && !editingName} onPointerDown={(e) => startDrag(e, groupName, 'groups', 'group-section--dragging')} />
          {editMode && !editingName && <span className="nav-item-drag-zone-divider" />}
          <DeleteButton show={editMode && !editingName} onClick={() => setConfirmDelete(true)} title="Delete group" />
        </div>
        <button
          className={`group-header-collapse${!collapsed ? ' group-header-collapse--expanded' : ''}`}
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? 'Expand group' : 'Collapse group'}
        >
          {collapsed ? <ChevronRight size={ICON_SIZE} /> : <ChevronDown size={ICON_SIZE} />}
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
          <span className="group-header-name" onClick={() => setCollapsed((p) => !p)}>
            {groupName} <span className="group-header-count">({rows.length})</span>
          </span>
        )}

        <div className="group-header-menu" ref={menuRef}>
          <button
            className="group-header-menu-btn"
            onClick={() => setMenuOpen((p) => !p)}
            aria-label="Group actions"
          >
            <MoreHorizontal size={ICON_SIZE} />
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
                  <Pencil size={ICON_SIZE} /> Rename
                </button>
                <button
                  className="group-header-dropdown-item group-header-dropdown-item--danger"
                  onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                >
                  <Trash2 size={ICON_SIZE} /> Delete group
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="group-section__body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2, ease: ease.out }}
            style={{ overflow: 'hidden' }}
          >
            <div data-reorder-context={groupName}>
              {rows.map((row) => (
                <HabitRow
                  key={row.task.id}
                  row={row}
                  editMode={editMode}
                  onToggle={() => onToggle(row)}
                  onSelect={() => onSelect(row)}
                  onDelete={() => onDelete(row)}
                  isSelected={selectedTaskId === row.task.id}
                  onReorderStart={(e) => startDrag(e, row.task.id, groupName, 'task-row--dragging')}
                  onGroupDragStart={(e) => onGroupDragStart(e, row.task.id)}
                />
              ))}
            </div>
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
    </div>
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

  const scrollRef = useRef<HTMLElement>(null);
  const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
    scrollRef,
    onCommit: (_dragId, _context, newIds) => {
      setListOrder(listId!, newIds);
    },
  });

  if (isLoading) return null;

  const orderedRows = applyOrder(rows, listOrders[listId!] ?? [], (r) => r.task.id);

  const ghostRow = dragId ? orderedRows.find((r) => r.task.id === dragId) : null;

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
    <>
      {ghostRow && createPortal(
        <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {ghostRow.task.title}
        </div>,
        document.body
      )}
      {createPortal(
        <div ref={lineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
        document.body
      )}
      <div>
        <div className="view-header">
          <div className="view-title-row">
            {list && getListIcon(list, 20) && <span className="view-title-icon">{getListIcon(list, 20)}</span>}
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
          <div data-reorder-context={listId}>
            {orderedRows.map((row) => (
              <HabitRow
                key={row.task.id}
                row={row}
                editMode={habitEditMode}
                onToggle={() => handleToggle(row.task.id)}
                onSelect={() => detail?.task.id === row.task.id ? closeDetail() : openDetail({ task: row.task })}
                onDelete={() => removeTask(row.task.id, listId!).then(reload)}
                isSelected={detail?.task.id === row.task.id}
                onReorderStart={(e) => startDrag(e, row.task.id, listId!, 'task-row--dragging')}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
