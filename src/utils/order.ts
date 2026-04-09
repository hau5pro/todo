/**
 * Apply a saved order to an array of items.
 * Items present in `order` come first (in order), followed by any items not yet in the order.
 */
export function applyOrder<T>(items: T[], order: string[], getId: (item: T) => string): T[] {
  if (order.length === 0) return items;
  const map = new Map(items.map((t) => [getId(t), t]));
  const ordered = order.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  const rest = items.filter((t) => !order.includes(getId(t)));
  return [...ordered, ...rest];
}

/**
 * Re-insert a dragged item into an ordered list after a given anchor.
 * insertAfter === null | '__start__' puts it first.
 */
export function reinsert(ids: string[], dragId: string, insertAfter: string | null): string[] {
  const without = ids.filter((id) => id !== dragId);
  if (!insertAfter || insertAfter === '__start__') return [dragId, ...without];
  const idx = without.indexOf(insertAfter);
  if (idx === -1) return [...without, dragId];
  return [...without.slice(0, idx + 1), dragId, ...without.slice(idx + 1)];
}
