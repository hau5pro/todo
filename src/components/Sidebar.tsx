import { NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getLists } from '../db/lists';
import type { List } from '../types';

export function Sidebar() {
  const [lists, setLists] = useState<List[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  useEffect(() => {
    getLists().then(setLists).catch((err) => console.error('Failed to load lists', err));
  }, []);

  const userLists = lists.filter((l) => l.type !== 'template');
  const templates = lists.filter((l) => l.type === 'template');

  return (
    <nav className="sidebar">
      <NavLink to="/my-day" className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}>
        My Day
      </NavLink>
      <div className="nav-section-label">Lists</div>
      {userLists.map((l) => (
        <NavLink
          key={l.id}
          to={`/list/${l.id}`}
          className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
        >
          {l.name}
        </NavLink>
      ))}
      {templates.length > 0 && (
        <>
          <button className="nav-section-label nav-section-label--button" onClick={() => setTemplatesOpen((o) => !o)}>
            Templates {templatesOpen ? '▾' : '▸'}
          </button>
          {templatesOpen && templates.map((l) => (
            <NavLink
              key={l.id}
              to={`/list/${l.id}`}
              className={({ isActive }) => isActive ? 'nav-item nav-item--active' : 'nav-item'}
            >
              {l.name}
            </NavLink>
          ))}
        </>
      )}
    </nav>
  );
}
