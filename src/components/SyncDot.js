import { jsx as _jsx } from "react/jsx-runtime";
export function SyncDot({ pendingCount, isSyncing }) {
    if (isSyncing) {
        return _jsx("span", { className: "sync-dot sync-dot--syncing", title: "Syncing\u2026" });
    }
    if (pendingCount > 0) {
        return _jsx("span", { className: "sync-dot sync-dot--pending", title: `${pendingCount} pending` });
    }
    return _jsx("span", { className: "sync-dot sync-dot--synced", title: "Synced" });
}
