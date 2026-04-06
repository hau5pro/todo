import { NavLink } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
  Sun, Settings2, LogOut, ChevronDown, ChevronRight,
  List, ShoppingCart, RefreshCw, CalendarCheck, Copy,
  GripVertical, Plus, Check, X,
} from 'lucide-react';
import { getLists, createList } from '../db/lists';
import { signOut } from '../supabase/auth';
import { useSettings } from '../contexts/SettingsContext';
import type { List as ListType, ListType as LT } from '../types';

const LIST_ICONS: Record<LT, React.ReactNode> = {
  general:  <List size={14} strokeWidth={1.75} />,
  shopping: <ShoppingCart size={14} strokeWidth={1.75} />,
  cyclical: <RefreshCw size={14} strokeWidth={1.75} />,
  daily:    <CalendarCheck size={14} strokeWidth={1.75} />,
  template: <Copy size={14} strokeWidth={1.75} />,
};

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
        <GripVertical size={13} strokeWidth={1.75} />
      </div>
      <NavLink
        to={`/list/${list.id}`}
        className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
      >
        {LIST_ICONS[list.type]}
        {list.name}
      </NavLink>
    </Reorder.Item>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [lists, setLists] = useState<ListType[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  const {
    hiddenListIds,
    showMyDay,
    pinnedOrder,
    customOrder,
    setPinnedOrder,
    setCustomOrder,
  } = useSettings();

  useEffect(() => {
    getLists().then(setLists).catch((err) => console.error('Failed to load lists', err));
  }, []);

  // Pinned: IDs in pinnedOrder mapped to list objects, filtered to existing
  const pinnedLists: ListType[] = pinnedOrder
    .map((id) => lists.find((l) => l.id === id))
    .filter((l): l is ListType => l !== undefined);

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
    setTimeout(() => addInputRef.current?.focus(), 0);
  }

  async function commitAddList() {
    const name = newListName.trim();
    if (!name) { setAddingList(false); return; }
    try {
      const created = await createList(name, 'general');
      setLists((prev) => [...prev, created]);
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
      {showMyDay && (
        <NavLink to="/my-day" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
          <Sun size={14} strokeWidth={1.75} />
          My Day
        </NavLink>
      )}

      {/* Pinned lists reorder group */}
      {pinnedLists.length > 0 && (
        <Reorder.Group
          as="div"
          axis="y"
          values={pinnedLists}
          onReorder={(newOrder) => setPinnedOrder(newOrder.map((l) => l.id))}
          className="nav-reorder-group"
        >
          {pinnedLists.map((l) => (
            <SortableItem key={l.id} list={l} />
          ))}
        </Reorder.Group>
      )}

      {/* Lists section label */}
      <div className="nav-section-label">
        Lists
        <button className="nav-add-btn" onClick={startAddList} title="New list">
          <Plus size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Custom lists reorder group */}
      <Reorder.Group
        as="div"
        axis="y"
        values={customLists}
        onReorder={(newOrder) => setCustomOrder(newOrder.map((l) => l.id))}
        className="nav-reorder-group"
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
            <Check size={13} strokeWidth={2} />
          </button>
          <button className="nav-action-btn" onClick={cancelAddList} title="Cancel">
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Templates section */}
      {templates.length > 0 && (
        <>
          <button className="nav-section-label nav-section-label--button" onClick={() => setTemplatesOpen((o) => !o)}>
            Templates {templatesOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
          {templatesOpen && templates.map((l) => (
            <NavLink
              key={l.id}
              to={`/list/${l.id}`}
              className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            >
              {LIST_ICONS.template}
              {l.name}
            </NavLink>
          ))}
        </>
      )}

      <div className="sidebar-spacer" />

      <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
        <Settings2 size={14} strokeWidth={1.75} />
        Settings
      </NavLink>
      <button className="nav-item nav-btn" onClick={() => signOut().catch(console.error)}>
        <LogOut size={14} strokeWidth={1.75} />
        Sign out
      </button>
    </nav>
  );
}
