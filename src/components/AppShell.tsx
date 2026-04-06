import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { SyncDot } from './SyncDot';
import { useSync } from '../hooks/useSync';

export function AppShell() {
  const { pendingCount, isSyncing, syncError: _syncError } = useSync();

  return (
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
          <span className="app-title">TO DO</span>
        </div>
        <SyncDot pendingCount={pendingCount} isSyncing={isSyncing} />
      </header>
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
