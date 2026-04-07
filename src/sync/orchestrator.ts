type SyncHandler = () => void;

let handler: SyncHandler | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

/** Called by useSync to register the active sync function. Returns a cleanup. */
export function registerSyncHandler(fn: SyncHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

/** Called by store mutations after any data-driven write. Debounced to coalesce rapid actions. */
export function requestSync(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    handler?.();
  }, DEBOUNCE_MS);
}
