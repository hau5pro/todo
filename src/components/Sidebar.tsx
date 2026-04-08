import { NavLink, useNavigate, useMatch, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Settings, LogOut, ChevronDown, ChevronRight,
  List, Plus, CheckCircle, Pencil, Menu,
  FolderPlus, Folder, Trash2, CornerDownLeft, MoreHorizontal, HelpCircle,
} from 'lucide-react';
import { logOut } from '../supabase/auth';
import { useSettings } from '../contexts/SettingsContext';
import { useAppStore } from '../store';
import { focusLater } from '../utils/dom';
import { ICON_SIZE } from '../config/constants';
import { getListIcon } from '../config/listIcons';
import type { List as ListType, ListFolder } from '../types';


const MY_DAY_SENTINEL = { id: 'my-day' as const };
type PinnedItem = ListType | typeof MY_DAY_SENTINEL;


const COLLAPSED_ICON_SIZE = 20;

// ── Portal tooltip for overflow-clipped containers ────────────────────────────

function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = useCallback(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.top + r.height / 2, left: r.right + 8 });
    }
  }, []);
  const hide = useCallback(() => setPos(null), []);

  return (
    <div ref={ref} onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {pos && createPortal(
        <div className="nav-tooltip" style={{ top: pos.top, left: pos.left }}>{label}</div>,
        document.body
      )}
    </div>
  );
}

function pinnedIcon(item: PinnedItem): React.ReactNode {
  if (item.id === 'my-day') return <Sun size={COLLAPSED_ICON_SIZE} />;
  return getListIcon(item as ListType, COLLAPSED_ICON_SIZE) ?? <List size={COLLAPSED_ICON_SIZE} />;
}

// ── Sortable list item ────────────────────────────────────────────────────────

function SortableItem({
  list,
  editMode,
  allowFolderDrag = true,
  pinned = false,
}: {
  list: ListType;
  editMode: boolean;
  allowFolderDrag?: boolean;
  pinned?: boolean;
}) {
  const dragControls = useDragControls();
  const deleteList = useAppStore((s) => s.deleteList);
  const navigate = useNavigate();
  const match = useMatch(`/list/${list.id}`);
  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ listId: list.id, folderId: list.folder_id }));
    const ghost = document.createElement('div');
    ghost.className = 'task-drag-ghost';
    ghost.textContent = list.name;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    requestAnimationFrame(() => document.body.removeChild(ghost));
  }

  async function handleDelete() {
    await deleteList(list.id);
    if (match) navigate('/');
  }

  return (
    <Reorder.Item
      as="div"
      value={list}
      dragListener={false}
      dragControls={dragControls}
      className={`nav-item-row${editMode ? ' nav-item-row--editing' : ''}`}
    >
      <AnimatePresence initial={false}>
        {editMode && (
          <motion.span
            style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 26, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* ≡ handle — triggers FM reorder only */}
            <span
              className="nav-drag-icon"
              title="Drag to reorder"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <List size={ICON_SIZE} />
            </span>
          </motion.span>
        )}
      </AnimatePresence>
      {/* List content — draggable in edit mode only for non-pinned lists */}
      {editMode ? (
        <div
          className="nav-item"
          draggable={allowFolderDrag}
          onDragStart={allowFolderDrag ? handleDragStart : undefined}
          style={allowFolderDrag ? { cursor: 'grab' } : undefined}
          title={allowFolderDrag ? 'Drag to move to folder' : undefined}
        >
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
      <AnimatePresence initial={false}>
        {editMode && !pinned && (
          <motion.button
            className="nav-item-delete-btn"
            onClick={handleDelete}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 24, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            title="Delete list"
          >
            <Trash2 size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

function SortableMyDayItem({ editMode }: { editMode: boolean }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={MY_DAY_SENTINEL}
      dragListener={false}
      dragControls={dragControls}
      className={`nav-item-row${editMode ? ' nav-item-row--editing' : ''}`}
    >
      <AnimatePresence initial={false}>
        {editMode && (
          <motion.span
            style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 26, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <span className="nav-drag-icon" title="Drag to reorder" onPointerDown={(e) => dragControls.start(e)}>
              <List size={ICON_SIZE} />
            </span>
          </motion.span>
        )}
      </AnimatePresence>
      {editMode ? (
        <div className="nav-item">
          <Sun size={ICON_SIZE} />
          My Day
        </div>
      ) : (
        <NavLink
          to="/my-day"
          className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
          data-nav-item
        >
          <Sun size={ICON_SIZE} />
          My Day
        </NavLink>
      )}
    </Reorder.Item>
  );
}

// ── Folder row ────────────────────────────────────────────────────────────────

function FolderRow({
  folder,
  listsInFolder,
  editMode,
  onDropList,
}: {
  folder: ListFolder;
  listsInFolder: ListType[];
  editMode: boolean;
  onDropList: (listId: string) => void;
}) {
  const dragControls = useDragControls();
  const { folderCollapsed, setFolderCollapsed, setFolderOrder } = useSettings();
  const renameFolder = useAppStore((s) => s.renameFolder);
  const deleteFolder = useAppStore((s) => s.deleteFolder);
  const { customOrder, setCustomOrder } = useSettings();

  const isCollapsed = folderCollapsed[folder.id] ?? false;
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  function openMenu() {
    if (menuBtnRef.current) {
      const rect = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setShowMenu(true);
  }

  function closeMenu() {
    setShowMenu(false);
  }

  function startRename() {
    closeMenu();
    setNewName(folder.name);
    setEditingName(true);
    focusLater(inputRef);
  }

  async function commitRename() {
    const name = newName.trim();
    if (name && name !== folder.name) await renameFolder(folder.id, name);
    setEditingName(false);
  }

  async function handleDelete() {
    const { movedListIds } = await deleteFolder(folder.id);
    setCustomOrder([
      ...movedListIds,
      ...customOrder.filter((id) => id !== folder.id && !movedListIds.includes(id)),
    ]);
    closeMenu();
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
      if (listId) onDropList(listId);
    } catch {}
  }

  return (
    <Reorder.Item
      as="div"
      value={folder}
      dragListener={false}
      dragControls={dragControls}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`nav-folder${isDragOver ? ' nav-folder--drag-over' : ''}`}
    >
      {/* Folder header */}
      <div className={`nav-folder-header${editMode ? ' nav-item-row--editing' : ''}`}>
        <AnimatePresence initial={false}>
          {editMode && (
            <motion.span
              style={{ overflow: 'hidden', flexShrink: 0, display: 'flex' }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 26, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span className="nav-drag-icon" title="Drag to reorder" onPointerDown={(e) => dragControls.start(e)}>
                <List size={ICON_SIZE} />
              </span>
            </motion.span>
          )}
        </AnimatePresence>

        {!editMode && (
          <button
            className="nav-folder-chevron"
            onClick={() => setFolderCollapsed(folder.id, !isCollapsed)}
            aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        )}

        <Folder size={ICON_SIZE} className="nav-folder-icon" />

        {editingName ? (
          <input
            ref={inputRef}
            className="nav-inline-input"
            inputMode="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setEditingName(false);
            }}
            onBlur={commitRename}
          />
        ) : editMode ? (
          <span className="nav-folder-name">{folder.name}</span>
        ) : (
          <NavLink
            to={`/folder/${folder.id}`}
            className={({ isActive }) => isActive ? 'nav-folder-name nav-folder-name--active' : 'nav-folder-name'}
            data-nav-item
          >
            {folder.name}
          </NavLink>
        )}

        {!editingName && (
          <button ref={menuBtnRef} className="nav-folder-menu-btn" onClick={openMenu} title="Folder options">
            <MoreHorizontal size={ICON_SIZE} />
          </button>
        )}

        {showMenu && menuPos && createPortal(
          <>
            <div className="folder-picker-backdrop" onClick={closeMenu} />
            <div className="folder-picker" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}>
              <button onClick={startRename}>
                <Pencil size={13} />
                Rename
              </button>
              <button className="folder-picker-danger" onClick={handleDelete}>
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </>,
          document.body
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
            <Reorder.Group
              as="div"
              axis="y"
              values={listsInFolder}
              onReorder={(newOrder) => setFolderOrder(folder.id, newOrder.map((l) => l.id))}
              className="nav-folder-lists"
            >
              {listsInFolder.map((l) => (
                <SortableItem
                  key={l.id}
                  list={l}
                  editMode={editMode}
                />
              ))}
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const SIDEBAR_W = window.innerWidth >= 1024 ? 256 : 208;
const COLLAPSED_W = 48;

export function Sidebar() {
  const lists = useAppStore((s) => s.lists);
  const folders = useAppStore((s) => s.folders);
  const createList = useAppStore((s) => s.createList);
  const createFolder = useAppStore((s) => s.createFolder);
  const moveListToFolder = useAppStore((s) => s.moveListToFolder);

  const [editMode, setEditMode] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [ungroupedDragOver, setUngroupedDragOver] = useState(false);
  const [isDraggingList, setIsDraggingList] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const addFolderInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Track any list drag for drop zone highlight
  useEffect(() => {
    const onStart = () => setIsDraggingList(true);
    const onEnd = () => setIsDraggingList(false);
    window.addEventListener('dragstart', onStart);
    window.addEventListener('dragend', onEnd);
    return () => {
      window.removeEventListener('dragstart', onStart);
      window.removeEventListener('dragend', onEnd);
    };
  }, []);


  const {
    hiddenListIds,
    pinnedOrder,
    customOrder,
    folderOrders,
    listsOpen,
    setPinnedOrder,
    setCustomOrder,
    setListsOpen,
    setFolderCollapsed,
    setFolderOrder,
    sidebarCollapsed,
    setSidebarCollapsed,
    localOnly,
    setLocalOnly,
  } = useSettings();

  const { pathname } = useLocation();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 640);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Collapse sidebar when navigating on mobile
  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [pathname]);

  // Pinned
  const pinnedItems: PinnedItem[] = pinnedOrder
    .map((id): PinnedItem | undefined =>
      id === 'my-day' ? MY_DAY_SENTINEL : lists.find((l) => l.id === id)
    )
    .filter((item): item is PinnedItem => item !== undefined)
    .filter((item) => !hiddenListIds.includes(item.id));

  // Non-pinned, non-daily lists (excluding hidden)
  const pinnedSet = new Set(pinnedOrder);
  const nonPinnedLists = lists.filter(
    (l) => l.type !== 'daily' && !pinnedSet.has(l.id) && !hiddenListIds.includes(l.id)
  );

  // Ungrouped lists (no folder)
  const ungroupedLists = nonPinnedLists.filter((l) => !l.folder_id);

  // Build ordered ungrouped list
  const customOrderedIds = customOrder.filter((id) => ungroupedLists.some((l) => l.id === id));
  const remainderLists = ungroupedLists.filter((l) => !customOrder.includes(l.id));
  const orderedUngrouped: ListType[] = [
    ...customOrderedIds.map((id) => ungroupedLists.find((l) => l.id === id)!),
    ...remainderLists,
  ];

  // Build ordered folders
  const customOrderedFolderIds = customOrder.filter((id) => folders.some((f) => f.id === id));
  const remainderFolders = folders.filter((f) => !customOrder.includes(f.id));
  const orderedFolders: ListFolder[] = [
    ...customOrderedFolderIds.map((id) => folders.find((f) => f.id === id)!),
    ...remainderFolders,
  ];

  function getFolderLists(folderId: string): ListType[] {
    const order = folderOrders[folderId] ?? [];
    const listsIn = nonPinnedLists.filter((l) => l.folder_id === folderId);
    const ordered = order.flatMap((id) => {
      const l = listsIn.find((x) => x.id === id);
      return l ? [l] : [];
    });
    const rest = listsIn.filter((l) => !order.includes(l.id));
    return [...ordered, ...rest];
  }

  async function commitAddList() {
    const name = newListName.trim();
    if (!name) { setAddingList(false); return; }
    try {
      const created = await createList(name, 'general');
      setCustomOrder([...customOrder, created.id]);
      navigate(`/list/${created.id}`);
    } catch (err) {
      console.error(err);
    }
    setAddingList(false);
    setNewListName('');
  }

  function cancelAddList() {
    setAddingList(false);
    setNewListName('');
  }

  function startAddList() {
    setShowAddMenu(false);
    setListsOpen(true);
    setAddingFolder(false);
    setNewFolderName('');
    setNewListName('');
    setAddingList(true);
    focusLater(addInputRef);
  }

  function startAddFolder() {
    setShowAddMenu(false);
    setListsOpen(true);
    setAddingList(false);
    setNewListName('');
    setNewFolderName('');
    setAddingFolder(true);
    focusLater(addFolderInputRef);
  }

  async function commitAddFolder() {
    const name = newFolderName.trim();
    if (!name) { setAddingFolder(false); return; }
    try {
      const created = await createFolder(name);
      setCustomOrder([...customOrder, created.id]);
      setFolderCollapsed(created.id, false);
    } catch (err) {
      console.error(err);
    }
    setAddingFolder(false);
    setNewFolderName('');
  }

  function cancelAddFolder() {
    setAddingFolder(false);
    setNewFolderName('');
  }

  async function handleMoveToFolder(listId: string, folderId: string | null) {
    await moveListToFolder(listId, folderId);
    if (folderId) {
      setCustomOrder(customOrder.filter((id) => id !== listId));
      const currentFolderOrder = folderOrders[folderId] ?? [];
      if (!currentFolderOrder.includes(listId)) {
        setFolderOrder(folderId, [...currentFolderOrder, listId]);
      }
      setFolderCollapsed(folderId, false);
    } else {
      if (!customOrder.includes(listId)) {
        setCustomOrder([...customOrder, listId]);
      }
      Object.keys(folderOrders).forEach((fid) => {
        if (folderOrders[fid].includes(listId)) {
          setFolderOrder(fid, folderOrders[fid].filter((id) => id !== listId));
        }
      });
    }
  }

  function handleUngroupedDragOver(e: React.DragEvent) {
    if (!editMode) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setUngroupedDragOver(true);
  }

  function handleUngroupedDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setUngroupedDragOver(false);
    }
  }

  function handleUngroupedDrop(e: React.DragEvent) {
    if (!editMode) return;
    e.preventDefault();
    setUngroupedDragOver(false);
    try {
      const { listId, folderId } = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (listId && folderId !== null) handleMoveToFolder(listId, null);
    } catch {}
  }


  return (
    <>
    {isMobile && !sidebarCollapsed && createPortal(
      <div
        className="sidebar-backdrop sidebar-backdrop--visible"
        onClick={() => setSidebarCollapsed(true)}
      />,
      document.body
    )}
    <motion.nav
      className="sidebar"
      animate={{ width: sidebarCollapsed ? COLLAPSED_W : (isMobile ? 280 : SIDEBAR_W) }}
      initial={false}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {sidebarCollapsed ? (
          <motion.div
            key="collapsed"
            className="sidebar--collapsed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.12, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
          >
            <div className="sidebar-toggle-section">
              <button
                className="sidebar-collapse-btn"
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
              >
                <Menu size={COLLAPSED_ICON_SIZE} />
              </button>
            </div>

            {pinnedItems.map((item) => {
              const label = item.id === 'my-day' ? 'My Day' : (item as ListType).name;
              return (
                <NavTooltip key={item.id} label={label}>
                  <NavLink
                    to={item.id === 'my-day' ? '/my-day' : `/list/${item.id}`}
                    className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
                    aria-label={label}
                  >
                    {pinnedIcon(item)}
                  </NavLink>
                </NavTooltip>
              );
            })}

            {(orderedUngrouped.length > 0 || orderedFolders.length > 0) && (
              <div className="sidebar-collapsed-divider" />
            )}

            {orderedUngrouped.map((list) => (
              <NavTooltip key={list.id} label={list.name}>
                <NavLink
                  to={`/list/${list.id}`}
                  className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
                  aria-label={list.name}
                >
                  {getListIcon(list, COLLAPSED_ICON_SIZE) ?? <List size={COLLAPSED_ICON_SIZE} />}
                </NavLink>
              </NavTooltip>
            ))}

            {orderedFolders.map((folder) => (
              <NavTooltip key={folder.id} label={folder.name}>
                <NavLink
                  to={`/folder/${folder.id}`}
                  className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
                  aria-label={folder.name}
                >
                  <Folder size={COLLAPSED_ICON_SIZE} />
                </NavLink>
              </NavTooltip>
            ))}

            <div className="sidebar-spacer" />

            <NavTooltip label="Help">
              <NavLink
                to="/docs"
                className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
                aria-label="Help"
              >
                <HelpCircle size={20} />
              </NavLink>
            </NavTooltip>
            <NavTooltip label="Settings">
              <NavLink
                to="/settings"
                className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
                aria-label="Settings"
              >
                <Settings size={20} />
              </NavLink>
            </NavTooltip>
            <NavTooltip label="Sign out">
              <button
                className="nav-icon-btn"
                onClick={() => logOut(localOnly, setLocalOnly).catch(console.error)}
                aria-label="Sign out"
              >
                <LogOut size={20} />
              </button>
            </NavTooltip>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            className="sidebar__inner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.14, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
          >
            {/* Toolbar: actions left, toggle right */}
            <div className="sidebar-toolbar">
              <div className="sidebar-toolbar__row">
                <span className="view-title-actions">
                  <button
                    className="sidebar-collapse-btn"
                    onClick={() => setShowAddMenu((p) => !p)}
                    title="New list or folder"
                    aria-expanded={showAddMenu}
                  >
                    <Plus size={ICON_SIZE} />
                  </button>
                  <button
                    className="sidebar-collapse-btn"
                    onClick={() => setEditMode((e) => !e)}
                    title={editMode ? 'Done reordering' : 'Reorder lists'}
                  >
                    {editMode
                      ? <CheckCircle size={ICON_SIZE} style={{ color: 'var(--success)' }} />
                      : <Pencil size={ICON_SIZE} />}
                  </button>
                </span>
                <button
                  className="sidebar-collapse-btn sidebar-collapse-btn--toggle"
                  onClick={() => setSidebarCollapsed(true)}
                  title="Collapse sidebar"
                >
                  <Menu size={ICON_SIZE} />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {showAddMenu && (
                  <motion.div
                    className="nav-add-options"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <button className="nav-add-option" onClick={startAddList}>
                      <List size={13} />
                      New list
                    </button>
                    <button className="nav-add-option" onClick={startAddFolder}>
                      <FolderPlus size={13} />
                      New folder
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pinned section */}
            {pinnedItems.length > 0 && (
              <Reorder.Group
                as="div"
                axis="y"
                values={pinnedItems}
                onReorder={(newOrder) => setPinnedOrder(newOrder.map((item) => item.id))}
                className="nav-reorder-group"
                initial={false}
              >
                {pinnedItems.map((item) =>
                  item.id === 'my-day'
                    ? <SortableMyDayItem key="my-day" editMode={editMode} />
                    : <SortableItem
                        key={item.id}
                        list={item as ListType}
                        editMode={editMode}
                        allowFolderDrag={false}
                        pinned
                      />
                )}
              </Reorder.Group>
            )}

            {pinnedItems.length > 0 && <div className="nav-divider" />}

            {/* Lists section header */}
            <div className="nav-section-header">
              <button
                className="nav-section-toggle"
                onClick={() => setListsOpen(!listsOpen)}
              >
                {listsOpen
                  ? <ChevronDown size={10} />
                  : <ChevronRight size={10} />}
                Lists
              </button>
            </div>

            {/* Lists section content */}
            <AnimatePresence initial={false}>
              {listsOpen && (
                <motion.div
                  key="lists-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
                  exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  {/* Ungrouped lists — drop zone for removing from folder */}
                  <div
                    onDragOver={handleUngroupedDragOver}
                    onDragLeave={handleUngroupedDragLeave}
                    onDrop={handleUngroupedDrop}
                    className={['nav-drop-zone', editMode && orderedUngrouped.length === 0 && 'nav-drop-zone--empty', editMode && isDraggingList && 'nav-drop-zone--dragging', ungroupedDragOver && 'nav-drop-zone--active'].filter(Boolean).join(' ')}
                  >
                    {editMode && orderedUngrouped.length === 0 && (
                      <span className="nav-remove-zone__label">Drop to ungroup</span>
                    )}
                    <Reorder.Group
                      as="div"
                      axis="y"
                      values={orderedUngrouped}
                      onReorder={(newOrder) => setCustomOrder([
                        ...newOrder.map((l) => l.id),
                        ...customOrder.filter((id) => folders.some((f) => f.id === id)),
                      ])}
                      className="nav-reorder-group"
                      initial={false}
                    >
                      {orderedUngrouped.map((l) => (
                        <SortableItem
                          key={l.id}
                          list={l}
                          editMode={editMode}
                        />
                      ))}
                    </Reorder.Group>
                  </div>

                  {/* Folders */}
                  <Reorder.Group
                    as="div"
                    axis="y"
                    values={orderedFolders}
                    onReorder={(newFolderOrder) => setCustomOrder([
                      ...customOrder.filter((id) => ungroupedLists.some((l) => l.id === id)),
                      ...newFolderOrder.map((f) => f.id),
                    ])}
                    className="nav-reorder-group"
                    initial={false}
                  >
                    {orderedFolders.map((folder) => (
                      <FolderRow
                        key={folder.id}
                        folder={folder}
                        listsInFolder={getFolderLists(folder.id)}
                        editMode={editMode}
                        onDropList={(listId) => handleMoveToFolder(listId, folder.id)}
                      />
                    ))}
                  </Reorder.Group>

                  {/* Add folder inline */}
                  {addingFolder && (
                    <div className="nav-item nav-item--editing">
                      <Folder size={ICON_SIZE} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                      <input
                        ref={addFolderInputRef}
                        className="nav-inline-input"
                        placeholder="Folder name"
                        inputMode="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitAddFolder();
                          if (e.key === 'Escape') cancelAddFolder();
                        }}
                        onBlur={commitAddFolder}
                      />
                      <button className="nav-action-btn" onClick={commitAddFolder} title="Create">
                        <CornerDownLeft size={ICON_SIZE} />
                      </button>
                    </div>
                  )}

                  {/* Add list inline */}
                  {addingList && (
                    <div className="nav-item nav-item--editing">
                      <input
                        ref={addInputRef}
                        className="nav-inline-input"
                        placeholder="List name"
                        inputMode="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitAddList();
                          if (e.key === 'Escape') cancelAddList();
                        }}
                        onBlur={commitAddList}
                      />
                      <button className="nav-action-btn" onClick={commitAddList} title="Create">
                        <CornerDownLeft size={ICON_SIZE} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sidebar-spacer" />

            <NavLink to="/docs" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
              <HelpCircle size={ICON_SIZE} />
              Help
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
              <Settings size={ICON_SIZE} />
              Settings
            </NavLink>
            <div style={{ height: '0.5rem' }} />
            <button className="nav-item nav-btn nav-item--signout" onClick={() => logOut(localOnly, setLocalOnly).catch(console.error)}>
              <LogOut size={ICON_SIZE} />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
    </>
  );
}
