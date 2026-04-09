import { useParams, NavLink, Navigate, useNavigate, useMatch } from 'react-router-dom';
import { useState } from 'react';
import { Folder, List, Pencil, CheckCircle } from 'lucide-react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { DragHandle, DeleteButton } from '../components/EditControls';
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
const listVariants = {
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

function SortableListItem({
  list,
  editMode,
  folderId,
}: {
  list: ListType;
  editMode: boolean;
  folderId: string;
}) {
  const dragControls = useDragControls();
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
    <Reorder.Item
      as="div"
      value={list}
      dragListener={false}
      dragControls={dragControls}
      variants={itemVariants}
      className={`folder-view-list-item-row${editMode ? ' folder-view-list-item-row--editing' : ''}`}
      transition={{ layout: { duration: 0.08, ease: 'easeOut' } }}
    >
      <DragHandle show={editMode} dragControls={dragControls} />

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

      <DeleteButton show={editMode} onClick={handleDelete} title="Delete list" />
    </Reorder.Item>
  );
}

export function FolderView() {
  const { folderId } = useParams<{ folderId: string }>();
  const folders = useAppStore((s) => s.folders);
  const lists = useAppStore((s) => s.lists);
  const { folderOrders, setFolderOrder } = useSettings();
  const [editMode, setEditMode] = useState(false);

  const folder = folders.find((f) => f.id === folderId);
  const rawFolderLists = lists.filter((l) => l.folder_id === folderId && !l.deleted_at);
  const folderLists = applyOrder(rawFolderLists, folderOrders[folderId!] ?? [], (l) => l.id);

  if (!folder) return <Navigate to="/" replace />;

  return (
    <div>
      <motion.div variants={headerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="view-header">
          <span className="view-title-icon"><Folder size={20} /></span>
          <div className="view-title-row">
            <h1 className="view-title">{folder.name}</h1>
            <span className="view-title-actions">
              <button
                className="view-title-action-btn"
                onClick={() => setEditMode((m) => !m)}
                title={editMode ? 'Done editing' : 'Edit lists'}
                style={editMode ? { color: 'var(--success)' } : undefined}
              >
                {editMode ? <CheckCircle size={ICON_SIZE} /> : <Pencil size={ICON_SIZE} />}
              </button>
            </span>
          </div>
          <p className="view-subtitle">{folderLists.length} {folderLists.length === 1 ? 'list' : 'lists'}</p>
        </motion.div>
      </motion.div>

      <Reorder.Group
        as="div"
        axis="y"
        values={folderLists}
        onReorder={(newOrder) => setFolderOrder(folderId!, newOrder.map((l) => l.id))}
        className="folder-view-lists view-body"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {folderLists.map((list) => (
          <SortableListItem
            key={list.id}
            list={list}
            editMode={editMode}
            folderId={folderId!}
          />
        ))}
        {folderLists.length === 0 && (
          <motion.p variants={itemVariants} className="empty-state">
            No lists in this folder.
          </motion.p>
        )}
      </Reorder.Group>
    </div>
  );
}
