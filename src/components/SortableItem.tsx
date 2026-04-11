import { memo } from 'react';
import { NavLink, useNavigate, useMatch } from 'react-router-dom';
import { List } from 'lucide-react';
import { DragHandle, DeleteButton } from './EditControls';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/constants';
import { getListIcon } from '../config/listIcons';
import { FolderInput } from 'lucide-react';
import type { List as ListType } from '../types';

export const SortableItem = memo(function SortableItem({
  list,
  editMode,
  allowFolderDrag = true,
  pinned = false,
  onFolderDragStart,
  onReorderDragStart,
}: {
  list: ListType;
  editMode: boolean;
  allowFolderDrag?: boolean;
  pinned?: boolean;
  onFolderDragStart?: (listId: string) => void;
  onReorderDragStart?: (e: React.PointerEvent, itemId: string) => void;
}) {
  const deleteList = useAppStore((s) => s.deleteList);
  const navigate = useNavigate();
  const match = useMatch(`/list/${list.id}`);

  async function handleDelete() {
    await deleteList(list.id);
    if (match) navigate('/');
  }

  return (
    <div
      className={`nav-item-row${editMode ? ' nav-item-row--editing' : ''}`}
      data-reorder-id={list.id}
    >
      <div className="nav-item-drag-zone">
        <DragHandle
          show={editMode}
          onPointerDown={onReorderDragStart ? (e) => onReorderDragStart(e, list.id) : undefined}
        />
        {editMode && allowFolderDrag && onFolderDragStart && (
          <span className="nav-item-drag-zone-divider" />
        )}
        {editMode && allowFolderDrag && onFolderDragStart && (
          <span
            className="task-edit-drag"
            title="Drag to move to folder"
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFolderDragStart(list.id);
            }}
          >
            <FolderInput size={ICON_SIZE} />
          </span>
        )}
        {editMode && !pinned && <span className="nav-item-drag-zone-divider" />}
        <DeleteButton show={editMode && !pinned} onClick={handleDelete} title="Delete list" />
      </div>
      {/* List content */}
      {editMode ? (
        <div className="nav-item">
          {getListIcon(list) ?? <List size={ICON_SIZE} />}
          <span className="nav-item__name">{list.name}</span>
        </div>
      ) : (
        <NavLink
          to={`/list/${list.id}`}
          className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
          data-nav-item
        >
          {getListIcon(list) ?? <List size={ICON_SIZE} />}
          <span className="nav-item__name">{list.name}</span>
        </NavLink>
      )}
    </div>
  );
});
