import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, MoreHorizontal, FolderInput } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { DragHandle, DeleteButton } from './EditControls';
import { HabitItem } from './HabitItem';
import { ease } from '../utils/easing';
import { focusLater } from '../utils/dom';
import { ICON_SIZE } from '../config/constants';
import type { HabitRow } from '../hooks/useHabits';

function HabitRowItem({ row, editMode, onToggle, onSelect, onDelete, isSelected, onReorderStart, onGroupDragStart, dragging }: {
  row: HabitRow; editMode: boolean;
  onToggle: (id: string) => void; onSelect: () => void; onDelete: () => void; isSelected: boolean;
  onReorderStart?: (e: React.PointerEvent) => void;
  onGroupDragStart?: (e: React.PointerEvent) => void;
  dragging?: boolean;
}) {
  return (
    <div
      data-reorder-id={row.task.id}
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
        <DeleteButton show={editMode} onClick={onDelete} title="Delete habit" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <HabitItem
          id={row.task.id}
          title={row.task.title}
          note={row.task.note}
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
  startDrag, onGroupDragStart, onToggle, onSelect, onDelete, onRename, onDeleteGroup, selectedTaskId, draggingHabitId,
}: {
  groupName: string;
  rows: HabitRow[];
  editMode: boolean;
  startDrag: (e: React.PointerEvent, id: string, context: string, cls?: string) => void;
  onGroupDragStart: (e: React.PointerEvent, taskId: string) => void;
  onToggle: (id: string) => void;
  onSelect: (row: HabitRow) => void;
  onDelete: (row: HabitRow) => void;
  onRename: (oldName: string, newName: string) => void;
  onDeleteGroup: (name: string) => void;
  selectedTaskId: string | undefined;
  draggingHabitId?: string | null;
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
      className={[
        'group-section',
        draggingHabitId ? 'group-section--dragging' : '',
      ].filter(Boolean).join(' ')}
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
                <HabitRowItem
                  key={row.task.id}
                  row={row}
                  editMode={editMode}
                  onToggle={onToggle}
                  onSelect={() => onSelect(row)}
                  onDelete={() => onDelete(row)}
                  isSelected={selectedTaskId === row.task.id}
                  onReorderStart={(e) => startDrag(e, row.task.id, groupName, 'task-row--dragging')}
                  onGroupDragStart={(e) => onGroupDragStart(e, row.task.id)}
                  dragging={draggingHabitId === row.task.id}
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
