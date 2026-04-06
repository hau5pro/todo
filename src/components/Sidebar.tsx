import { NavLink } from 'react-router-dom';
import { useState, useRef } from 'react';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import {
  Sun, GearSix, SignOut, CaretDown, CaretRight,
  List, Plus, Check, X, PencilSimple,
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

export function Sidebar() {
  const lists = useAppStore((s) => s.lists);
  const createList = useAppStore((s) => s.createList);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [editPinned, setEditPinned] = useState(false);
  const [editLists, setEditLists] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const {
    hiddenListIds,
    pinnedOrder,
    customOrder,
    setPinnedOrder,
    setCustomOrder,
  } = useSettings();

  // Pinned: IDs in pinnedOrder mapped to list objects or the my-day sentinel
  const pinnedItems: PinnedItem[] = pinnedOrder
    .map((id): PinnedItem | undefined =>
      id === 'my-day' ? MY_DAY_SENTINEL : lists.find((l) => l.id === id)
    )
    .filter((item): item is PinnedItem => item !== undefined)
    .filter((item) => item.id === 'my-day' || !hiddenListIds.includes(item.id));

  // Custom: non-template lists NOT in pinnedOrder, sorted by customOrder
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
    <nav className="sidebar">
      {/* Pinned section */}
      {pinnedItems.length > 0 && (
        <>
          <div className="nav-section-label">
            Pinned
            <button
              className="nav-add-btn"
              onClick={() => setEditPinned((e) => !e)}
              title={editPinned ? 'Done' : 'Reorder pinned'}
            >
              {editPinned ? <Check size={ICON_SIZE} weight="fill" /> : <PencilSimple size={ICON_SIZE} weight="fill" />}
            </button>
          </div>
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
                ? <SortableMyDayItem key="my-day" editMode={editPinned} />
                : <SortableItem key={item.id} list={item as ListType} editMode={editPinned} />
            )}
          </Reorder.Group>
        </>
      )}

      {/* Lists section */}
      <div className="nav-section-label">
        Lists
        <button
          className="nav-add-btn"
          onClick={() => setEditLists((e) => !e)}
          title={editLists ? 'Done' : 'Reorder lists'}
        >
          {editLists ? <Check size={ICON_SIZE} weight="fill" /> : <PencilSimple size={ICON_SIZE} weight="fill" />}
        </button>
      </div>
      <Reorder.Group
        as="div"
        axis="y"
        values={customLists}
        onReorder={(newOrder) => setCustomOrder(newOrder.map((l) => l.id))}
        className="nav-reorder-group"
        initial={false}
      >
        {customLists.map((l) => (
          <SortableItem key={l.id} list={l} editMode={editLists} />
        ))}
      </Reorder.Group>

      {/* Add list — inline form or button */}
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
    </nav>
  );
}
