interface Props {
  pendingCount: number;
  isSyncing: boolean;
}

import { Cloud } from '@phosphor-icons/react';

export function SyncDot({ pendingCount, isSyncing }: Props) {
  const title = isSyncing ? 'Syncing…' : pendingCount > 0 ? `${pendingCount} pending` : 'Synced';
  const mod = isSyncing ? 'syncing' : pendingCount > 0 ? 'pending' : 'synced';
  return (
    <span className="sync-indicator" title={title}>
      <Cloud size={20} weight="fill" className="sync-cloud-icon" />
      <span className={`sync-dot sync-dot--${mod}`} />
    </span>
  );
}
