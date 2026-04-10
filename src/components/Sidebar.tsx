import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Settings, ChevronDown, ChevronRight,
  List, Plus, CheckCircle, Pencil, Menu,
  FolderPlus, Folder, CornerDownLeft,
} from 'lucide-react';
import { DragHandle } from './EditControls';
import { useSettings } from '../contexts/SettingsContext';
import { useAppStore } from '../store';
import { ICON_SIZE } from '../config/constants';
import { getListIcon } from '../config/listIcons';
import { SortableItem } from './SortableItem';
import { FolderRow } from './FolderRow';
import type { List as ListType, ListFolder } from '../types';
import { reinsert } from '../utils/order';

const COLLAPSED_ICON_SIZE = 26;

const MY_DAY_SENTINEL = { id: 'my-day' as const };
type PinnedItem = ListType | typeof MY_DAY_SENTINEL;



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

function pinnedIcon(item: PinnedItem, size = ICON_SIZE): React.ReactNode {
  if (item.id === 'my-day') return <Sun size={size} />;
  return getListIcon(item as ListType, size) ?? <List size={size} />;
}

function SortableMyDayItem({
  editMode,
  onReorderDragStart,
}: {
  editMode: boolean;
  onReorderDragStart?: (e: React.PointerEvent, itemId: string) => void;
}) {
  return (
    <div
      className={`nav-item-row${editMode ? ' nav-item-row--editing' : ''}`}
      data-reorder-id="my-day"
    >
      <div className="nav-item-drag-zone">
        <DragHandle
          show={editMode}
          onPointerDown={onReorderDragStart ? (e) => onReorderDragStart(e, 'my-day') : undefined}
        />
      </div>
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
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const SIDEBAR_W = window.innerWidth >= 1024 ? 256 : 208;
const COLLAPSED_W = 56;

export function Sidebar() {
  const lists = useAppStore((s) => s.lists);
  const folders = useAppStore((s) => s.folders);
  const createList = useAppStore((s) => s.createList);
  const createFolder = useAppStore((s) => s.createFolder);
  const moveListToFolder = useAppStore((s) => s.moveListToFolder);

  const [editMode, setEditMode] = useState(false);
  const [folderDragListId, setFolderDragListId] = useState<string | null>(null);
  const folderDragTargetRef = useRef<string | null>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragPointerYRef = useRef<number>(0);
  const [reorderDragId, setReorderDragId] = useState<string | null>(null);
  const reorderContextRef = useRef<string | null>(null);
  const reorderInsertAfterRef = useRef<string | null>(null);
  const reorderItemsRef = useRef<{ id: string; el: HTMLElement }[]>([]);
  const reorderGhostRef = useRef<HTMLDivElement>(null);
  const reorderLineRef = useRef<HTMLDivElement>(null);
  const commitReorderRef = useRef<(dragId: string, context: string) => void>(() => {});
  const [addingList, setAddingList] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [ungroupedDragOver, setUngroupedDragOver] = useState(false);
  const [isDraggingList, setIsDraggingList] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const addFolderInputRef = useRef<HTMLInputElement>(null);
  const collapsedScrollRef = useRef<HTMLDivElement>(null);
  const collapsedScrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const expandedScrollRef = useRef<HTMLDivElement>(null);
  const expandedScrollTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const navigate = useNavigate();

  function handleCollapsedScroll() {
    const el = collapsedScrollRef.current;
    if (!el) return;
    el.classList.add('is-scrolling');
    clearTimeout(collapsedScrollTimer.current);
    collapsedScrollTimer.current = setTimeout(() => {
      el.classList.remove('is-scrolling');
    }, 600);
  }

  function handleExpandedScroll() {
    const el = expandedScrollRef.current;
    if (!el) return;
    el.classList.add('is-scrolling');
    clearTimeout(expandedScrollTimer.current);
    expandedScrollTimer.current = setTimeout(() => {
      el.classList.remove('is-scrolling');
    }, 600);
  }

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

  useEffect(() => {
    if (!folderDragListId) return;

    function highlightTarget(target: string | null) {
      const el = target ? document.querySelector(`[data-folder-id="${target}"]`) : null;
      if (!el) return;
      if (target === '__ungrouped__') el.classList.add('nav-drop-zone--active');
      else el.classList.add('nav-folder--drag-over');
    }

    function unhighlightTarget(target: string | null) {
      const el = target ? document.querySelector(`[data-folder-id="${target}"]`) : null;
      if (!el) return;
      if (target === '__ungrouped__') el.classList.remove('nav-drop-zone--active');
      else el.classList.remove('nav-folder--drag-over');
    }

    const rafId = { current: 0 };
    function edgeScrollLoop() {
      const scrollEl = expandedScrollRef.current;
      if (scrollEl) {
        const { top, bottom } = scrollEl.getBoundingClientRect();
        const y = dragPointerYRef.current;
        const ZONE = 64, MAX = 14;
        if (y > top && y < top + ZONE)
          scrollEl.scrollTop -= MAX * (1 - (y - top) / ZONE);
        else if (y > bottom - ZONE && y < bottom)
          scrollEl.scrollTop += MAX * (1 - (bottom - y) / ZONE);
      }
      rafId.current = requestAnimationFrame(edgeScrollLoop);
    }
    rafId.current = requestAnimationFrame(edgeScrollLoop);

    function onMove(e: PointerEvent) {
      dragPointerYRef.current = e.clientY;
      if (ghostRef.current) {
        ghostRef.current.style.display = 'flex';
        ghostRef.current.style.left = `${e.clientX + 12}px`;
        ghostRef.current.style.top = `${e.clientY + 12}px`;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const folderEl = el?.closest('[data-folder-id]');
      const newTarget = folderEl?.getAttribute('data-folder-id') ?? null;
      if (newTarget !== folderDragTargetRef.current) {
        unhighlightTarget(folderDragTargetRef.current);
        highlightTarget(newTarget);
        folderDragTargetRef.current = newTarget;
      }
    }

    function onUp() {
      const target = folderDragTargetRef.current;
      unhighlightTarget(target);
      if (target === '__ungrouped__') handleMoveToFolderRef.current(folderDragListId, null);
      else if (target) handleMoveToFolderRef.current(folderDragListId, target);
      folderDragTargetRef.current = null;
      setFolderDragListId(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      unhighlightTarget(folderDragTargetRef.current);
      folderDragTargetRef.current = null;
    };
  }, [folderDragListId]);

  useEffect(() => {
    if (!reorderDragId) return;
    const context = reorderContextRef.current;
    if (!context) return;

    const group = document.querySelector(`[data-reorder-context="${context}"]`);
    if (!group) return;

    reorderItemsRef.current = Array.from(group.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-reorder-id'))
      .map((el) => ({ id: el.getAttribute('data-reorder-id')!, el }));

    const draggedEl = group.querySelector<HTMLElement>(`[data-reorder-id="${reorderDragId}"]`);
    draggedEl?.classList.add('nav-item-row--dragging');

    const rafId = { current: 0 };
    function edgeScrollLoop() {
      const scrollEl = expandedScrollRef.current;
      if (scrollEl) {
        const { top, bottom } = scrollEl.getBoundingClientRect();
        const y = dragPointerYRef.current;
        const ZONE = 64, MAX = 14;
        if (y > top && y < top + ZONE)
          scrollEl.scrollTop -= MAX * (1 - (y - top) / ZONE);
        else if (y > bottom - ZONE && y < bottom)
          scrollEl.scrollTop += MAX * (1 - (bottom - y) / ZONE);
      }
      rafId.current = requestAnimationFrame(edgeScrollLoop);
    }
    rafId.current = requestAnimationFrame(edgeScrollLoop);

    function onMove(e: PointerEvent) {
      dragPointerYRef.current = e.clientY;
      if (reorderGhostRef.current) {
        reorderGhostRef.current.style.display = 'flex';
        reorderGhostRef.current.style.left = `${e.clientX + 14}px`;
        reorderGhostRef.current.style.top = `${e.clientY + 10}px`;
      }

      const items = reorderItemsRef.current;
      let insertAfter: string | null = '__start__';
      for (const { id, el } of items) {
        if (id === reorderDragId) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.top + rect.height / 2) insertAfter = id;
      }
      reorderInsertAfterRef.current = insertAfter;

      if (reorderLineRef.current && items.length > 1) {
        let lineY: number | null = null;
        if (insertAfter === '__start__') {
          const first = items.find(({ id }) => id !== reorderDragId);
          if (first) lineY = first.el.getBoundingClientRect().top;
        } else {
          const after = items.find(({ id }) => id === insertAfter);
          if (after) lineY = after.el.getBoundingClientRect().bottom;
        }
        if (lineY !== null) {
          // safe: group was checked `if (!group) return` earlier in this effect
          const groupRect = group!.getBoundingClientRect();
          reorderLineRef.current.style.opacity = '1';
          reorderLineRef.current.style.top = `${lineY}px`;
          reorderLineRef.current.style.left = `${groupRect.left + 4}px`;
          reorderLineRef.current.style.width = `${groupRect.width - 8}px`;
        }
      }
    }

    function cleanup() {
      draggedEl?.classList.remove('nav-item-row--dragging');
      if (reorderGhostRef.current) reorderGhostRef.current.style.display = 'none';
      if (reorderLineRef.current) reorderLineRef.current.style.opacity = '0';
      reorderItemsRef.current = [];
      reorderInsertAfterRef.current = null;
    }

    function onUp() {
      commitReorderRef.current(reorderDragId!, context!);
      cleanup();
      setReorderDragId(null);
    }

    function onCancel() {
      cleanup();
      setReorderDragId(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanup();
    };
  }, [reorderDragId]);

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
  const pinnedItems = useMemo<PinnedItem[]>(() => pinnedOrder
    .map((id): PinnedItem | undefined =>
      id === 'my-day' ? MY_DAY_SENTINEL : lists.find((l) => l.id === id)
    )
    .filter((item): item is PinnedItem => item !== undefined)
    .filter((item) => !hiddenListIds.includes(item.id)),
  [pinnedOrder, lists, hiddenListIds]);

  // Non-pinned, non-daily lists (excluding hidden)
  const nonPinnedLists = useMemo(() => {
    const pinnedSet = new Set(pinnedOrder);
    return lists.filter(
      (l) => l.type !== 'daily' && !pinnedSet.has(l.id) && !hiddenListIds.includes(l.id)
    );
  }, [lists, pinnedOrder, hiddenListIds]);

  // Ungrouped lists (no folder)
  const ungroupedLists = useMemo(() =>
    nonPinnedLists.filter((l) => !l.folder_id),
  [nonPinnedLists]);

  // Build ordered ungrouped list
  const orderedUngrouped = useMemo<ListType[]>(() => {
    const customOrderedIds = customOrder.filter((id) => ungroupedLists.some((l) => l.id === id));
    const remainderLists = ungroupedLists.filter((l) => !customOrder.includes(l.id));
    return [
      ...customOrderedIds.map((id) => ungroupedLists.find((l) => l.id === id)!),
      ...remainderLists,
    ];
  }, [customOrder, ungroupedLists]);

  // Build ordered folders
  const orderedFolders = useMemo<ListFolder[]>(() => {
    const customOrderedFolderIds = customOrder.filter((id) => folders.some((f) => f.id === id));
    const remainderFolders = folders.filter((f) => !customOrder.includes(f.id));
    return [
      ...customOrderedFolderIds.map((id) => folders.find((f) => f.id === id)!),
      ...remainderFolders,
    ];
  }, [customOrder, folders]);

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
    addInputRef.current?.focus();
  }

  function startAddFolder() {
    setShowAddMenu(false);
    setListsOpen(true);
    setAddingList(false);
    setNewListName('');
    setNewFolderName('');
    setAddingFolder(true);
    addFolderInputRef.current?.focus();
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

  const handleMoveToFolderRef = useRef<(listId: string | null, folderId: string | null) => void>(() => {});

  const handleMoveToFolder = useCallback(async (listId: string | null, folderId: string | null) => {
    if (!listId) return;
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
  }, [moveListToFolder, customOrder, folderOrders, setCustomOrder, setFolderOrder, setFolderCollapsed]);

  handleMoveToFolderRef.current = handleMoveToFolder;

  const stableHandleMoveToFolder = useCallback((listId: string | null, folderId: string | null) => {
    handleMoveToFolderRef.current(listId, folderId);
  }, []);

  const handleFolderDragStart = useCallback((listId: string) => {
    setFolderDragListId(listId);
  }, []);

  const startReorder = useCallback((e: React.PointerEvent, itemId: string, context: string) => {
    e.preventDefault();
    reorderContextRef.current = context;
    setReorderDragId(itemId);
  }, []);

  const handlePinnedReorderDragStart = useCallback((e: React.PointerEvent, id: string) => {
    startReorder(e, id, 'pinned');
  }, [startReorder]);

  const handleUngroupedReorderDragStart = useCallback((e: React.PointerEvent, id: string) => {
    startReorder(e, id, 'ungrouped');
  }, [startReorder]);

  const folderListsMap = useMemo(() => {
    const map: Record<string, ListType[]> = {};
    for (const folder of orderedFolders) {
      const order = folderOrders[folder.id] ?? [];
      const listsIn = nonPinnedLists.filter((l) => l.folder_id === folder.id);
      const ordered = order.flatMap((id) => { const l = listsIn.find((x) => x.id === id); return l ? [l] : []; });
      const rest = listsIn.filter((l) => !order.includes(l.id));
      map[folder.id] = [...ordered, ...rest];
    }
    return map;
  }, [orderedFolders, nonPinnedLists, folderOrders]);

  function commitReorder(dragId: string, context: string) {
    const insertAfter = reorderInsertAfterRef.current;
    if (context === 'pinned') {
      setPinnedOrder(reinsert(pinnedItems.map((i) => i.id), dragId, insertAfter));
    } else if (context === 'ungrouped') {
      const newUngrouped = reinsert(orderedUngrouped.map((l) => l.id), dragId, insertAfter);
      setCustomOrder([
        ...newUngrouped,
        ...customOrder.filter((id) => folders.some((f) => f.id === id)),
      ]);
    } else if (context === 'folders') {
      const newFolders = reinsert(orderedFolders.map((f) => f.id), dragId, insertAfter);
      setCustomOrder([
        ...customOrder.filter((id) => ungroupedLists.some((l) => l.id === id)),
        ...newFolders,
      ]);
    } else {
      setFolderOrder(context, reinsert((folderListsMap[context] ?? []).map((l) => l.id), dragId, insertAfter));
    }
  }

  commitReorderRef.current = commitReorder;

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


  const folderDragList = folderDragListId ? lists.find(l => l.id === folderDragListId) : null;

  const reorderDragItem = useMemo(() => {
    if (!reorderDragId) return null;
    if (reorderDragId === 'my-day') return { name: 'My Day', icon: <Sun size={ICON_SIZE} /> };
    const list = lists.find((l) => l.id === reorderDragId);
    if (list) return { name: list.name, icon: getListIcon(list, ICON_SIZE) ?? <List size={ICON_SIZE} /> };
    const folder = folders.find((f) => f.id === reorderDragId);
    if (folder) return { name: folder.name, icon: <Folder size={ICON_SIZE} /> };
    return null;
  }, [reorderDragId, lists, folders]);

  return (
    <>
    {folderDragList && createPortal(
      <div ref={ghostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
        {getListIcon(folderDragList, ICON_SIZE) ?? <List size={ICON_SIZE} />}
        {folderDragList.name}
      </div>,
      document.body
    )}
    {reorderDragItem && createPortal(
      <div ref={reorderGhostRef} className="folder-drag-ghost" style={{ display: 'none' }}>
        {reorderDragItem.icon}
        {reorderDragItem.name}
      </div>,
      document.body
    )}
    {createPortal(
      <div ref={reorderLineRef} className="nav-reorder-line" style={{ opacity: 0 }} />,
      document.body
    )}
    {isMobile && !sidebarCollapsed && createPortal(
      <div
        className="sidebar-backdrop sidebar-backdrop--visible"
        onClick={() => setSidebarCollapsed(true)}
      />,
      document.body
    )}
    <motion.nav
      className="sidebar"
      animate={{ width: sidebarCollapsed ? COLLAPSED_W : (isMobile ? '100vw' : SIDEBAR_W) }}
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
            <div className="sidebar-collapsed-top">
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
                      {pinnedIcon(item, COLLAPSED_ICON_SIZE)}
                    </NavLink>
                  </NavTooltip>
                );
              })}

              {(orderedUngrouped.length > 0 || orderedFolders.length > 0) && (
                <div className="sidebar-collapsed-divider" />
              )}
            </div>

            <div className="sidebar-collapsed-scroll" ref={collapsedScrollRef} onScroll={handleCollapsedScroll}>
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
            </div>

            <div className="sidebar-collapsed-bottom">
              <NavTooltip label="Settings">
                <NavLink
                  to="/settings"
                  className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
                  aria-label="Settings"
                >
                  <Settings size={COLLAPSED_ICON_SIZE} />
                </NavLink>
              </NavTooltip>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            className="sidebar__inner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.14, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
          >
            <div className="sidebar-expanded-top">
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
                    title={editMode ? 'Done editing' : 'Edit lists'}
                  >
                    {editMode
                      ? <CheckCircle size={ICON_SIZE} style={{ color: 'var(--success)' }} />
                      : <Pencil size={ICON_SIZE} />}
                  </button>
                </span>
                <button
                  className="sidebar-collapse-btn sidebar-collapse-btn--toggle"
                  onClick={() => { setSidebarCollapsed(true); setEditMode(false); }}
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
                      <List size={ICON_SIZE} />
                      New list
                    </button>
                    <button className="nav-add-option" onClick={startAddFolder}>
                      <FolderPlus size={ICON_SIZE} />
                      New folder
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pinned section */}
            {pinnedItems.length > 0 && (
              <div className="nav-reorder-group" data-reorder-context="pinned">
                {pinnedItems.map((item) =>
                  item.id === 'my-day'
                    ? <SortableMyDayItem
                        key="my-day"
                        editMode={editMode}
                        onReorderDragStart={editMode ? handlePinnedReorderDragStart : undefined}
                      />
                    : <SortableItem
                        key={item.id}
                        list={item as ListType}
                        editMode={editMode}
                        allowFolderDrag={false}
                        pinned
                        onReorderDragStart={editMode ? handlePinnedReorderDragStart : undefined}
                      />
                )}
              </div>
            )}

            {pinnedItems.length > 0 && <div className="nav-divider" />}

            {/* Lists section header */}
            <div className="nav-section-header">
              <button
                className="nav-section-toggle"
                onClick={() => setListsOpen(!listsOpen)}
              >
                My Lists
                {listsOpen
                  ? <ChevronDown size={ICON_SIZE} />
                  : <ChevronRight size={ICON_SIZE} />}
              </button>
            </div>
            </div>{/* end sidebar-expanded-top */}

            <div className="sidebar-expanded-scroll" ref={expandedScrollRef} onScroll={handleExpandedScroll}>
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
                    data-folder-id="__ungrouped__"
                    className={['nav-drop-zone', editMode && orderedUngrouped.length === 0 && 'nav-drop-zone--empty', editMode && (isDraggingList || folderDragListId) && 'nav-drop-zone--dragging', ungroupedDragOver && 'nav-drop-zone--active'].filter(Boolean).join(' ')}
                  >
                    {editMode && orderedUngrouped.length === 0 && (
                      <span className="nav-remove-zone__label">Drop to ungroup</span>
                    )}
                    <div className="nav-reorder-group" data-reorder-context="ungrouped">
                      {orderedUngrouped.map((l) => (
                        <SortableItem
                          key={l.id}
                          list={l}
                          editMode={editMode}
                          onFolderDragStart={handleFolderDragStart}
                          onReorderDragStart={editMode ? handleUngroupedReorderDragStart : undefined}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Folders */}
                  <div className="nav-reorder-group" data-reorder-context="folders">
                    {orderedFolders.map((folder) => (
                      <FolderRow
                        key={folder.id}
                        folder={folder}
                        listsInFolder={folderListsMap[folder.id] ?? []}
                        editMode={editMode}
                        onMoveToFolder={stableHandleMoveToFolder}
                        onFolderDragStart={handleFolderDragStart}
                        startReorder={editMode ? startReorder : undefined}
                      />
                    ))}
                  </div>

                  {/* Add folder inline — always mounted so focus() works synchronously on iOS PWA.
                      On iOS Safari in standalone (PWA) mode, calling .focus() on an input that was
                      just mounted via conditional rendering doesn't raise the keyboard reliably.
                      Keeping the input in the DOM at all times and hiding it visually means the
                      element is already live when focus() is called, which iOS requires. */}
                  <div className="nav-item nav-item--editing" style={addingFolder ? undefined : { position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
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

                  {/* Add list inline — always mounted for the same iOS PWA focus reason above. */}
                  <div className="nav-item nav-item--editing" style={addingList ? undefined : { position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
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
                </motion.div>
              )}
            </AnimatePresence>
            </div>{/* end sidebar-expanded-scroll */}

            <div className="sidebar-expanded-bottom">
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'} onClick={() => setEditMode(false)}>
              <Settings size={ICON_SIZE} />
              Settings
            </NavLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
    </>
  );
}
