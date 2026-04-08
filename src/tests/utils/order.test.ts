import { describe, it, expect } from 'vitest';
import { applyOrder } from '../../utils/order';

const getId = (item: { id: string }) => item.id;

describe('applyOrder', () => {
  it('returns items as-is when order is empty', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(applyOrder(items, [], getId)).toEqual(items);
  });

  it('reorders items according to order array', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = applyOrder(items, ['c', 'a', 'b'], getId);
    expect(result.map((i) => i.id)).toEqual(['c', 'a', 'b']);
  });

  it('puts items not in order after ordered items', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const result = applyOrder(items, ['b'], getId);
    expect(result[0].id).toBe('b');
    expect(result.slice(1).map((i) => i.id).sort()).toEqual(['a', 'c']);
  });

  it('ignores IDs in order that are not in items', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const result = applyOrder(items, ['x', 'a', 'y', 'b'], getId);
    expect(result.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('handles empty items array', () => {
    expect(applyOrder([], ['a', 'b'], getId)).toEqual([]);
  });

  it('handles order containing all items in reverse', () => {
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    const result = applyOrder(items, ['3', '2', '1'], getId);
    expect(result.map((i) => i.id)).toEqual(['3', '2', '1']);
  });
});
