import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Sun, Settings2, LogOut, ChevronDown, ChevronRight, List, ShoppingCart, RefreshCw, CalendarCheck, Copy } from 'lucide-react';
import { getLists } from '../db/lists';
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

export function Sidebar() {
  const [lists, setLists] = useState<ListType[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const { hiddenListIds, showMyDay } = useSettings();

  useEffect(() => {
    getLists().then(setLists).catch((err) => console.error('Failed to load lists', err));
  }, []);

  const userLists = lists.filter((l) => l.type !== 'template' && !hiddenListIds.includes(l.id));
  const templates = lists.filter((l) => l.type === 'template' && !hiddenListIds.includes(l.id));

  return (
    <nav className="sidebar">
      {showMyDay && (
        <NavLink to="/my-day" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
          <Sun size={14} strokeWidth={1.75} />
          My Day
        </NavLink>
      )}

      <div className="nav-section-label">Lists</div>
      {userLists.map((l) => (
        <NavLink
          key={l.id}
          to={`/list/${l.id}`}
          className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
        >
          {LIST_ICONS[l.type]}
          {l.name}
        </NavLink>
      ))}

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
