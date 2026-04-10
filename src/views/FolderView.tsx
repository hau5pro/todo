import { useParams, NavLink, Navigate, useNavigate, useMatch } from 'react-router-dom';
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Folder, List, Pencil, CheckCircle, Trash2, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragHandle, DeleteButton } from '../components/EditControls';
import { useLineDrag } from '../hooks/useLineDrag';
import { useAppStore } from '../store';
import { useSettings } from '../contexts/SettingsContext';
import { applyOrder } from '../utils/order';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import { ease } from '../utils/easing';
import type { List as ListType } from '../types';

const headerVariants = {
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2, ease: ease.out } },
};

function SortableListItem({
  list,
  editMode,
  folderId,
  onReorderStart,
}: {
  list: ListType;
  editMode: boolean;
  folderId: string;
  onReorderStart?: (e: React.PointerEvent) => void;
}) {
  const deleteList = useAppStore((s) => s.deleteList);
  const { folderOrders, setFolderOrder } = useSettings();
  const navigate = useNavigate();
  const match = useMatch(`/list/${list.id}`);

  async function handleDelete() {
    const currentOrder = folderOrders[folderId] ?? [];
    setFolderOrder(folderId, currentOrder.filter((id) => id !== list.id));
    await deleteList(list.id);
    if (match) navigate(`/folder/${folderId}`);
  }

  return (
    <div
      data-reorder-id={list.id}
      className={`folder-view-list-item-row${editMode ? ' folder-view-list-item-row--editing' : ''}`}
    >
      <div className="nav-item-drag-zone">
        <DragHandle show={editMode} onPointerDown={onReorderStart} />
        {editMode && <span className="nav-item-drag-zone-divider" />}
        <DeleteButton show={editMode} onClick={handleDelete} title="Delete list" />
      </div>

      {editMode ? (
        <div className="folder-view-list-item">
          <span className="folder-view-list-icon">
            {getListIcon(list, ICON_SIZE) ?? <List size={ICON_SIZE} />}
          </span>
          <span className="folder-view-list-name">{list.name}</span>
        </div>
      ) : (
        <NavLink to={`/list/${list.id}`} className="folder-view-list-item" data-nav-row>
          <span className="folder-view-list-icon">
            {getListIcon(list, ICON_SIZE) ?? <List size={ICON_SIZE} />}
          </span>
          <span className="folder-view-list-name">{list.name}</span>
        </NavLink>
      )}
    </div>
  );
}

export function FolderView() {
  const { folderId } = useParams<{ folderId: string }>();
  const folders = useAppStore((s) => s.folders);
  const lists = useAppStore((s) => s.lists);
  const renameFolder = useAppStore((s) => s.renameFolder);
  const deleteFolder = useAppStore((s) => s.deleteFolder);
  const duplicateFolder = useAppStore((s) => s.duplicateFolder);
  const createList = useAppStore((s) => s.createList);
  const navigate = useNavigate();
  const { folderOrders, setFolderOrder, customOrder, setCustomOrder, setFolderCollapsed } = useSettings();
  const [editMode, setEditMode] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [newListName, setNewListName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const addListRef = useRef<HTMLInputElement>(null);

  const folder = folders.find((f) => f.id === folderId);
  const rawFolderLists = lists.filter((l) => l.folder_id === folderId && !l.deleted_at);
  const folderLists = applyOrder(rawFolderLists, folderOrders[folderId!] ?? [], (l) => l.id);

  const scrollRef = useRef<HTMLElement>(null);
  const { dragId, startDrag, ghostRef, lineRef } = useLineDrag({
    scrollRef,
    onCommit: (_dragId, _context, newIds) => {
      setFolderOrder(folderId!, newIds);
    },
  });

  const ghostList = dragId ? folderLists.find((l) => l.id === dragId) : null;

  function startEditName() {
    setNameValue(folder!.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 0);
  }

  async function commitEditName() {
    const name = nameValue.trim();
    if (name && name !== folder!.name) await renameFolder(folderId!, name);
    setEditingName(false);
  }

  async function executeDeleteFolder() {
    const { movedListIds } = await deleteFolder(folderId!);
    setCustomOrder([
      ...movedListIds,
      ...customOrder.filter((id) => id !== folderId && !movedListIds.includes(id)),
    ]);
    navigate('/');
  }

  async function handleDuplicate() {
    const newFolder = await duplicateFolder(folderId!);
    setCustomOrder([...customOrder, newFolder.id]);
    setFolderCollapsed(newFolder.id, false);
    navigate(`/folder/${newFolder.id}`);
  }

  async function commitAddList() {
    const name = newListName.trim();
    if (!name) return;
    const newList = await createList(name, 'general', folderId);
    setFolderOrder(folderId!, [...(folderOrders[folderId!] ?? []), newList.id]);
    setNewListName('');
    navigate(`/list/${newList.id}`);
  }

  if (!folder) return <Navigate to="/" replace />;

  return (
    <>
      {ghostList && createPortal(
        <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
          {getListIcon(ghostList, ICON_SIZE) ?? <List size={ICON_SIZE} />}
          {ghostList.name}
        </div>,
        document.body
      )}
      {createPortal(
        <div ref={lineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
        document.body
      )}
      <div>
        <motion.div variants={headerVariants} initial="hidden" animate="show">
          <motion.div variants={itemVariants} className="view-header">
            <span className="view-title-icon"><Folder size={20} /></span>
            <div className="view-title-row">
              {editingName ? (
                <>
                  <input
                    ref={nameInputRef}
                    className="view-title-input"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onBlur={commitEditName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEditName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                  />
                  <button className="view-title-action-btn" onClick={commitEditName} title="Save"><CheckCircle size={ICON_SIZE} /></button>
                </>
              ) : (
                <>
                  <h1 className="view-title" onClick={startEditName} style={{ cursor: 'text' }}>{folder.name}</h1>
                  <span className="view-title-actions">
                    <button
                      className="view-title-action-btn"
                      onClick={() => { if (editingName) setEditingName(false); setEditMode((m) => !m); }}
                      title={editMode ? 'Done editing' : 'Edit lists'}
                      style={editMode ? { color: 'var(--success)' } : undefined}
                    >
                      {editMode ? <CheckCircle size={ICON_SIZE} /> : <Pencil size={ICON_SIZE} />}
                    </button>
                    <button className="view-title-action-btn" onClick={handleDuplicate} title="Duplicate folder"><Copy size={ICON_SIZE} /></button>
                    <button className="view-title-action-btn view-title-action-btn--danger" onClick={() => setConfirmDeleteFolder(true)} title="Delete folder"><Trash2 size={ICON_SIZE} /></button>
                  </span>
                </>
              )}
            </div>
            <p className="view-subtitle">{folderLists.length} {folderLists.length === 1 ? 'list' : 'lists'}</p>
          </motion.div>
        </motion.div>

        <div className="folder-view-lists view-body" data-reorder-context="folder-lists">
          {folderLists.map((list) => (
            <SortableListItem
              key={list.id}
              list={list}
              editMode={editMode}
              folderId={folderId!}
              onReorderStart={(e) => startDrag(e, list.id, 'folder-lists', 'folder-view-list-item-row--dragging')}
            />
          ))}
          <form onSubmit={(e) => { e.preventDefault(); commitAddList(); }}>
            <input
              ref={addListRef}
              className="add-task-input"
              placeholder="Add list…"
              aria-label="Add list"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onBlur={commitAddList}
            />
          </form>
        </div>
      </div>

      <AnimatePresence>
        {confirmDeleteFolder && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setConfirmDeleteFolder(false)}
          >
            <motion.div
              className="modal-popup"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.15, ease: [0, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="modal-popup__title">Delete "{folder.name}"?</h3>
              <p className="modal-popup__body">The lists inside will be moved to the root level.</p>
              <div className="modal-popup__actions">
                <button className="btn-danger-sm" onClick={executeDeleteFolder}>Delete</button>
                <button className="btn-ghost-sm" onClick={() => setConfirmDeleteFolder(false)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
