interface Props {
  pendingCount: number;
  isSyncing: boolean;
}

export function SyncDot({ pendingCount, isSyncing }: Props) {
  if (isSyncing) {
    return <span className="sync-dot sync-dot--syncing" title="Syncing…" />;
  }
  if (pendingCount > 0) {
    return <span className="sync-dot sync-dot--pending" title={`${pendingCount} pending`} />;
  }
  return <span className="sync-dot sync-dot--synced" title="Synced" />;
}
