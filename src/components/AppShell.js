import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { SyncDot } from './SyncDot';
import { useSync } from '../hooks/useSync';
export function AppShell() {
    const { pendingCount, isSyncing, syncError: _syncError } = useSync();
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("header", { className: "app-header", children: [_jsxs("div", { className: "app-logo", children: [_jsx("div", { className: "app-logo__mark", children: _jsx("svg", { width: "15", height: "15", viewBox: "0 0 15 15", fill: "none", "aria-hidden": "true", children: _jsx("polyline", { points: "2,8 6,12 13,4", stroke: "var(--accent)", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("span", { className: "app-title", children: "TO DO" })] }), _jsx(SyncDot, { pendingCount: pendingCount, isSyncing: isSyncing })] }), _jsxs("div", { className: "app-body", children: [_jsx(Sidebar, {}), _jsx("main", { className: "app-main", children: _jsx(Outlet, {}) })] }), _jsx(BottomNav, {})] }));
}
