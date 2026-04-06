import { NavLink } from 'react-router-dom';
import { useState, useRef } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Sun, GearSix, SignOut, CaretDown, CaretRight,
  DotsSixVertical, Plus, Check, X,
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

// ── SortableItem ─────────────────────────────────────────────────────────────

function SortableItem({ list }: { list: ListType }) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      as="div"
      value={list}
      dragListener={false}
      dragControls={dragControls}
      className="nav-item-row"
    >
      <div className="nav-drag-handle" onPointerDown={(e) => dragControls.start(e)}>
        <DotsSixVertical size={ICON_SIZE} weight="fill" />
      </div>
      <NavLink
        to={`/list/${list.id}`}
        className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
      >
        {getListIcon(list)}
        {list.name}
      </NavLink>
    </Reorder.Item>
  );
}

function SortableMyDayItem() {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      as="div"
      value={MY_DAY_SENTINEL}
      dragListener={false}
      dragControls={dragControls}
      className="nav-item-row"
    >
      <div className="nav-drag-handle" onPointerDown={(e) => dragControls.start(e)}>
        <DotsSixVertical size={ICON_SIZE} weight="fill" />
      </div>
      <NavLink to="/my-day" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
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
      {/* Pinned items reorder group (includes My Day sentinel) */}
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
              ? <SortableMyDayItem key="my-day" />
              : <SortableItem key={item.id} list={item as ListType} />
          )}
        </Reorder.Group>
      )}

      {/* Lists section label */}
      <div className="nav-section-label">
        Lists
        <button className="nav-add-btn" onClick={startAddList} title="New list">
          <Plus size={ICON_SIZE} weight="fill" />
        </button>
      </div>

      {/* Custom lists reorder group */}
      <Reorder.Group
        as="div"
        axis="y"
        values={customLists}
        onReorder={(newOrder) => setCustomOrder(newOrder.map((l) => l.id))}
        className="nav-reorder-group"
        initial={false}
      >
        {customLists.map((l) => (
          <SortableItem key={l.id} list={l} />
        ))}
      </Reorder.Group>

      {/* Inline add form */}
      {addingList && (
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
