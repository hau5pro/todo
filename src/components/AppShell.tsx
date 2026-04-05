import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { SyncDot } from './SyncDot';
import { useSync } from '../hooks/useSync';

export function AppShell() {
  const { pendingCount, isSyncing } = useSync();

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">todo</span>
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
