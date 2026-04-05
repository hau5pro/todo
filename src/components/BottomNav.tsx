import { NavLink, useLocation } from 'react-router-dom';

export function BottomNav() {
  const location = useLocation();
  const inList = location.pathname.startsWith('/list/');

  return (
    <nav className="bottom-nav">
      <NavLink to="/my-day" className={({ isActive }) => isActive ? 'bottom-tab bottom-tab--active' : 'bottom-tab'}>
        My Day
      </NavLink>
      <NavLink to="/lists" className={({ isActive }) => isActive ? 'bottom-tab bottom-tab--active' : 'bottom-tab'}>
        Lists
      </NavLink>
      {inList && (
        <span className="bottom-tab bottom-tab--active">List</span>
      )}
    </nav>
  );
}
