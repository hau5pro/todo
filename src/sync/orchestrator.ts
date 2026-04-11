type SyncHandler = () => void | Promise<void>;

let handler: SyncHandler | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
let pendingAfterInFlight = false;
const DEBOUNCE_MS = 500;

/** Called by useSync to register the active sync function. Returns a cleanup. */
export function registerSyncHandler(fn: SyncHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

function runHandler(): void {
  if (!handler) return;
  // If a sync is already running, mark that another run is needed when it completes.
  // This prevents mutations made during an in-flight push from being silently dropped.
  if (inFlight) {
    pendingAfterInFlight = true;
    return;
  }
  const result = handler();
  if (result && typeof (result as Promise<void>).then === 'function') {
    inFlight = (result as Promise<void>)
      .catch(() => {
        // Errors are surfaced by the handler itself; orchestrator only cares about completion.
      })
      .finally(() => {
        inFlight = null;
        if (pendingAfterInFlight) {
          pendingAfterInFlight = false;
          runHandler();
        }
      });
  }
}

/**
 * Called by store mutations after any data-driven write. Debounced to coalesce rapid actions.
 * Debouncing avoids hammering the network on every keystroke — e.g. renaming a list fires a
 * store write per character; we only want one push after the user stops typing.
 */
export function requestSync(): void {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runHandler();
  }, DEBOUNCE_MS);
}
