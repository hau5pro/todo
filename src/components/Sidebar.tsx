import { NavLink } from 'react-router-dom';
import { useState, useRef } from 'react';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import {
  Sun, GearSix, SignOut, CaretDown, CaretRight,
  List, Plus, Check, X, PencilSimple, SidebarSimple,
} from '@phosphor-icons/react';
import { signOut } from '../supabase/auth';
import { useSettings } from '../contexts/SettingsContext';
import { useAppStore } from '../store';
import { focusLater } from '../utils/dom';
import { ICON_SIZE } from '../config/icons';
import { getListIcon } from '../config/listIcons';
import type { List as ListType } from '../types';


const MY_DAY_SENTINEL = { id: 'my-day' as const };
type PinnedItem = ListType | typeof MY_DAY_SENTINEL;

const COLLAPSED_ICON_SIZE = 20;

function pinnedIcon(item: PinnedItem): React.ReactNode {
  if (item.id === 'my-day') return <Sun size={COLLAPSED_ICON_SIZE} weight="fill" />;
  return getListIcon(item as ListType, COLLAPSED_ICON_SIZE) ?? <List size={COLLAPSED_ICON_SIZE} weight="fill" />;
}

// ── Sortable components ───────────────────────────────────────────────────────

function SortableItem({ list, editMode }: { list: ListType; editMode: boolean }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={list}
      dragListener={false}
      dragControls={dragControls}
      onPointerDown={editMode ? (e) => dragControls.start(e) : undefined}
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
            <span className="nav-drag-icon">
              <List size={ICON_SIZE} weight="bold" />
            </span>
          </motion.span>
        )}
      </AnimatePresence>
      <NavLink
        to={`/list/${list.id}`}
        className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
        style={editMode ? { pointerEvents: 'none' } : undefined}
      >
        {getListIcon(list)}
        {list.name}
      </NavLink>
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
      onPointerDown={editMode ? (e) => dragControls.start(e) : undefined}
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
            <span className="nav-drag-icon">
              <List size={ICON_SIZE} weight="bold" />
            </span>
          </motion.span>
        )}
      </AnimatePresence>
      <NavLink
        to="/my-day"
        className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
        style={editMode ? { pointerEvents: 'none' } : undefined}
      >
        <Sun size={ICON_SIZE} weight="fill" />
        My Day
      </NavLink>
    </Reorder.Item>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const SIDEBAR_W = 208;
const COLLAPSED_W = 40;

export function Sidebar() {
  const lists = useAppStore((s) => s.lists);
  const createList = useAppStore((s) => s.createList);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const {
    hiddenListIds,
    pinnedOrder,
    customOrder,
    setPinnedOrder,
    setCustomOrder,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useSettings();

  // Pinned
  const pinnedItems: PinnedItem[] = pinnedOrder
    .map((id): PinnedItem | undefined =>
      id === 'my-day' ? MY_DAY_SENTINEL : lists.find((l) => l.id === id)
    )
    .filter((item): item is PinnedItem => item !== undefined)
    .filter((item) => !hiddenListIds.includes(item.id));

  // Custom lists
  const pinnedSet = new Set(pinnedOrder);
  const nonPinnedLists = lists.filter(
    (l) => l.type !== 'template' && !pinnedSet.has(l.id) && !hiddenListIds.includes(l.id)
  );
  const customOrderedIds = customOrder.filter((id) => nonPinnedLists.some((l) => l.id === id));
  const remainder = nonPinnedLists.filter((l) => !customOrder.includes(l.id));
  const customLists: ListType[] = [
    ...customOrderedIds.map((id) => nonPinnedLists.find((l) => l.id === id)!),
    ...remainder,
  ];

  const templates = lists.filter((l) => l.type === 'template' && !hiddenListIds.includes(l.id));

  function startAddList() {
    setNewListName('');
    setAddingList(true);
    focusLater(addInputRef);
  }

  async function commitAddList() {
    const name = newListName.trim();
    if (!name) { setAddingList(false); return; }
    try {
      const created = await createList(name, 'general');
      setCustomOrder([...customOrder, created.id]);
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

  return (
    <motion.nav
      className="sidebar"
      animate={{ width: sidebarCollapsed ? COLLAPSED_W : SIDEBAR_W }}
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
            <div className="sidebar-toolbar">
              <button
                className="sidebar-collapse-btn"
                onClick={() => setSidebarCollapsed(false)}
                title="Expand sidebar"
              >
                <SidebarSimple size={COLLAPSED_ICON_SIZE} weight="fill" />
              </button>
            </div>

            {pinnedItems.map((item) => {
              const label = item.id === 'my-day' ? 'My Day' : (item as ListType).name;
              return (
                <NavLink
                  key={item.id}
                  to={item.id === 'my-day' ? '/my-day' : `/list/${item.id}`}
                  className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
                  aria-label={label}
                  data-tooltip={label}
                >
                  {pinnedIcon(item)}
                </NavLink>
              );
            })}

            <div className="sidebar-spacer" />

            <NavLink
              to="/settings"
              className={({ isActive }) => isActive ? 'nav-icon-btn nav-icon-btn--active' : 'nav-icon-btn'}
              aria-label="Settings"
              data-tooltip="Settings"
            >
              <GearSix size={20} weight="fill" />
            </NavLink>
            <button
              className="nav-icon-btn"
              onClick={() => signOut().catch(console.error)}
              aria-label="Sign out"
              data-tooltip="Sign out"
            >
              <SignOut size={20} weight="fill" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            className="sidebar__inner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.14, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
          >
            {/* Top toolbar: edit + collapse */}
            <div className="sidebar-toolbar">
              <button
                className="sidebar-collapse-btn"
                onClick={() => setEditMode((e) => !e)}
                title={editMode ? 'Done reordering' : 'Reorder lists'}
              >
                {editMode ? <Check size={ICON_SIZE} weight="fill" /> : <PencilSimple size={ICON_SIZE} weight="fill" />}
              </button>
              <button
                className="sidebar-collapse-btn"
                onClick={() => setSidebarCollapsed(true)}
                title="Collapse sidebar"
              >
                <SidebarSimple size={ICON_SIZE} weight="fill" />
              </button>
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
                    : <SortableItem key={item.id} list={item as ListType} editMode={editMode} />
                )}
              </Reorder.Group>
            )}

            {/* Lists section */}
            <div className="nav-section-label">Lists</div>
            <Reorder.Group
              as="div"
              axis="y"
              values={customLists}
              onReorder={(newOrder) => setCustomOrder(newOrder.map((l) => l.id))}
              className="nav-reorder-group"
              initial={false}
            >
              {customLists.map((l) => (
                <SortableItem key={l.id} list={l} editMode={editMode} />
              ))}
            </Reorder.Group>

            {/* Add list */}
            {addingList ? (
              <div className="nav-item nav-item--editing">
                <input
                  ref={addInputRef}
                  className="nav-inline-input"
                  placeholder="List name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAddList();
                    if (e.key === 'Escape') cancelAddList();
                  }}
                />
                <button className="nav-action-btn" onClick={commitAddList} title="Create">
                  <Check size={ICON_SIZE} weight="fill" />
                </button>
                <button className="nav-action-btn" onClick={cancelAddList} title="Cancel">
                  <X size={ICON_SIZE} weight="fill" />
                </button>
              </div>
            ) : (
              <button className="nav-item nav-btn nav-add-list-btn" onClick={startAddList}>
                <Plus size={ICON_SIZE} weight="fill" />
                New list
              </button>
            )}

            {/* Templates section */}
            {templates.length > 0 && (
              <>
                <button className="nav-section-label nav-section-label--button" onClick={() => setTemplatesOpen((o) => !o)}>
                  Templates {templatesOpen ? <CaretDown size={ICON_SIZE} weight="fill" /> : <CaretRight size={ICON_SIZE} weight="fill" />}
                </button>
                {templatesOpen && templates.map((l) => (
                  <NavLink
                    key={l.id}
                    to={`/list/${l.id}`}
                    className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
                  >
                    {getListIcon(l)}
                    {l.name}
                  </NavLink>
                ))}
              </>
            )}

            <div className="sidebar-spacer" />

            <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
              <GearSix size={ICON_SIZE} weight="fill" />
              Settings
            </NavLink>
            <div style={{ height: '0.5rem' }} />
            <button className="nav-item nav-btn nav-item--signout" onClick={() => signOut().catch(console.error)}>
              <SignOut size={ICON_SIZE} weight="fill" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
