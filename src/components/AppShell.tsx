import { useEffect, useMemo } from 'react';
import { Outlet, useLocation, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ease } from '../utils/easing';
import { Sidebar } from './Sidebar';
import { SyncDot } from './SyncDot';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TaskDetailProvider, useTaskDetail } from '../contexts/TaskDetailContext';
import { useSync } from '../hooks/useSync';
import { useAppStore } from '../store';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { useBlockEdgeSwipe } from '../hooks/useBlockEdgeSwipe';

function DetailSlot() {
  const { detail, close } = useTaskDetail();
  const { pathname } = useLocation();

  useEffect(() => { close(); }, [pathname, close]);

  return (
    <AnimatePresence>
      {detail && <TaskDetailPanel />}
    </AnimatePresence>
  );
}

function KeyboardNavController() {
  useKeyboardNav();
  useBlockEdgeSwipe();
  return null;
}

export function AppShell() {
  const { pathname } = useLocation();
  const { pendingCount, isSyncing, syncError: _syncError, syncEnabled } = useSync();
  const loadLists = useAppStore((s) => s.loadLists);
  const loadFolders = useAppStore((s) => s.loadFolders);
  const lists = useAppStore((s) => s.lists);
  const headerDate = useMemo(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  , []);

  useEffect(() => {
    loadLists();
    loadFolders();
  }, []);

  useEffect(() => {
    let viewName = 'TO DO';
    if (pathname === '/my-day') {
      viewName = 'TO DO | My Day';
    } else {
      const match = pathname.match(/^\/list\/(.+)$/);
      if (match) {
        const list = lists.find((l) => l.id === match[1]);
        if (list) viewName = `TO DO | ${list.name}`;
      }
    }
    document.title = viewName;
  }, [pathname, lists]);

  return (
    <TaskDetailProvider>
      <KeyboardNavController />
      <div className="app-shell">
        <Sidebar />
        <div className="app-right">
          <header className="app-header">
            <NavLink to="/my-day" className="app-logo">
              <div className="app-logo__mark">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
                  <polyline
                    points="2,8 6,12 13,4"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="app-title">
                {headerDate}
              </span>
            </NavLink>
            {syncEnabled && <SyncDot pendingCount={pendingCount} isSyncing={isSyncing} />}
          </header>
          <div className="app-body">
            <main className="app-main">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: ease.out }}
              >
                <Outlet />
              </motion.div>
            </main>
            <DetailSlot />
          </div>
        </div>
      </div>
    </TaskDetailProvider>
  );
}
