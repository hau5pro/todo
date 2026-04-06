import { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { SyncDot } from './SyncDot';
import { TaskDetailPanel } from './TaskDetailPanel';
import { TaskDetailProvider, useTaskDetail } from '../contexts/TaskDetailContext';
import { useSync } from '../hooks/useSync';
import { useAppStore } from '../store';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

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
  return null;
}

export function AppShell() {
  const { pendingCount, isSyncing, syncError: _syncError } = useSync();
  const loadLists = useAppStore((s) => s.loadLists);
  const loadFolders = useAppStore((s) => s.loadFolders);
  const headerDate = useMemo(() =>
    new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  , []);

  useEffect(() => {
    loadLists();
    loadFolders();
  }, []);

  return (
    <TaskDetailProvider>
      <KeyboardNavController />
      <div className="app-shell">
        <header className="app-header">
          <div className="app-logo">
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
          </div>
          <SyncDot pendingCount={pendingCount} isSyncing={isSyncing} />
        </header>
        <div className="app-body">
          <Sidebar />
          <main className="app-main">
            <Outlet />
          </main>
          <DetailSlot />
        </div>
        <BottomNav />
      </div>
    </TaskDetailProvider>
  );
}
