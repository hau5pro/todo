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
