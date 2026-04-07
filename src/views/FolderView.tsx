import { useParams, NavLink, Navigate } from 'react-router-dom';
import { Folder, List } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store';
import { getListIcon } from '../config/listIcons';
import { ICON_SIZE } from '../config/constants';
import { ease } from '../utils/easing';

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

export function FolderView() {
  const { folderId } = useParams<{ folderId: string }>();
  const folders = useAppStore((s) => s.folders);
  const lists = useAppStore((s) => s.lists);

  const folder = folders.find((f) => f.id === folderId);
  const folderLists = lists.filter((l) => l.folder_id === folderId && !l.deleted_at);

  if (!folder) return <Navigate to="/" replace />;

  return (
    <div>
      <motion.div variants={headerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="view-title-row">
          <span className="view-title-icon">
            <Folder size={20} />
          </span>
          <h1 className="view-title">{folder.name}</h1>
        </motion.div>
        <motion.p variants={itemVariants} className="view-subtitle">
          {folderLists.length} {folderLists.length === 1 ? 'list' : 'lists'}
        </motion.p>
      </motion.div>

      <motion.div
        className="folder-view-lists"
        variants={listVariants}
        initial="hidden"
        animate="show"
      >
        {folderLists.map((list) => (
          <motion.div key={list.id} variants={itemVariants}>
            <NavLink to={`/list/${list.id}`} className="folder-view-list-item" data-nav-row>
              <span className="folder-view-list-icon">
                {getListIcon(list, ICON_SIZE) ?? <List size={ICON_SIZE} />}
              </span>
              <span className="folder-view-list-name">{list.name}</span>
            </NavLink>
          </motion.div>
        ))}
        {folderLists.length === 0 && (
          <motion.p variants={itemVariants} className="empty-state">
            No lists in this folder.
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
