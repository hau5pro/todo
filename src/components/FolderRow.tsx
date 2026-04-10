import { useState, useCallback, memo } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, ChevronDown, ChevronRight } from 'lucide-react';
import { DragHandle, DeleteButton } from './EditControls';
import { SortableItem } from './SortableItem';
import { useSettings } from '../contexts/SettingsContext';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/constants';
import type { List as ListType, ListFolder } from '../types';

export const FolderRow = memo(function FolderRow({
  folder,
  listsInFolder,
  editMode,
  onMoveToFolder,
  onFolderDragStart,
  startReorder,
}: {
  folder: ListFolder;
  listsInFolder: ListType[];
  editMode: boolean;
  onMoveToFolder: (listId: string | null, folderId: string | null) => void;
  onFolderDragStart?: (listId: string) => void;
  startReorder?: (e: React.PointerEvent, itemId: string, context: string) => void;
}) {
  const { folderCollapsed, setFolderCollapsed } = useSettings();
  const deleteFolder = useAppStore((s) => s.deleteFolder);
  const { customOrder, setCustomOrder } = useSettings();

  const isCollapsed = folderCollapsed[folder.id] ?? false;

  const handleListReorderDragStart = useCallback((e: React.PointerEvent, listId: string) => {
    startReorder?.(e, listId, folder.id);
  }, [startReorder, folder.id]);

  const [isDragOver, setIsDragOver] = useState(false);

  async function handleDelete() {
    const { movedListIds } = await deleteFolder(folder.id);
    setCustomOrder([
      ...movedListIds,
      ...customOrder.filter((id) => id !== folder.id && !movedListIds.includes(id)),
    ]);
  }

  function handleDragOver(e: React.DragEvent) {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    if (!editMode) return;
    e.preventDefault();
    setIsDragOver(false);
    try {
      const { listId } = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (listId) onMoveToFolder(listId, folder.id);
    } catch {}
  }

  return (
    <div data-reorder-id={folder.id} className={editMode ? 'nav-item-row--editing' : undefined}>
      <div
        data-folder-id={folder.id}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`nav-folder${isDragOver ? ' nav-folder--drag-over' : ''}`}
      >
      {/* Folder header */}
      <div className={`nav-folder-header${editMode ? ' nav-item-row--editing' : ''}`}>
        <div className="nav-item-drag-zone">
          <DragHandle
            show={editMode}
            onPointerDown={startReorder ? (e) => startReorder(e, folder.id, 'folders') : undefined}
          />
          {editMode && <span className="nav-item-drag-zone-divider" />}
          <DeleteButton show={editMode} onClick={handleDelete} title="Delete folder" />
        </div>

        {editMode ? (
          <>
            <Folder size={ICON_SIZE} className="nav-folder-icon" />
            <span className="nav-folder-name">{folder.name}</span>
          </>
        ) : (
          <NavLink
            to={`/folder/${folder.id}`}
            className={({ isActive }) => isActive ? 'nav-folder-name nav-folder-name--active' : 'nav-folder-name'}
            data-nav-item
          >
            <Folder size={ICON_SIZE} className="nav-folder-icon" />
            {folder.name}
          </NavLink>
        )}

        {!editMode && (
          <button
            className="nav-folder-chevron"
            onClick={() => setFolderCollapsed(folder.id, !isCollapsed)}
            aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
          >
            {isCollapsed ? <ChevronRight size={ICON_SIZE} /> : <ChevronDown size={ICON_SIZE} />}
          </button>
        )}
      </div>

      {/* Lists inside folder */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="nav-folder-lists" data-reorder-context={folder.id}>
              {listsInFolder.map((l) => (
                <SortableItem
                  key={l.id}
                  list={l}
                  editMode={editMode}
                  onFolderDragStart={onFolderDragStart}
                  onReorderDragStart={startReorder ? handleListReorderDragStart : undefined}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
});
