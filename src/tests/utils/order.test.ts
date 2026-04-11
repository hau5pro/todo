import { describe, it, expect } from 'vitest';
import { applyOrder, reinsert } from '../../utils/order';

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

describe('reinsert', () => {
  it('moves item to start when insertAfter is __start__', () => {
    expect(reinsert(['a', 'b', 'c'], 'c', '__start__')).toEqual(['c', 'a', 'b']);
  });

  it('moves item to start when insertAfter is null', () => {
    expect(reinsert(['a', 'b', 'c'], 'b', null)).toEqual(['b', 'a', 'c']);
  });

  it('moves item after the specified id', () => {
    expect(reinsert(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'c', 'a']);
  });

  it('handles moving item that is already in position', () => {
    expect(reinsert(['a', 'b', 'c'], 'b', 'a')).toEqual(['a', 'b', 'c']);
  });

  it('appends at end when insertAfter id is not found', () => {
    expect(reinsert(['a', 'b', 'c'], 'a', 'z')).toEqual(['b', 'c', 'a']);
  });

  it('gracefully handles dragId not present in the array — appends it', () => {
    expect(reinsert(['a', 'b', 'c'], 'x', 'b')).toEqual(['a', 'b', 'x', 'c']);
  });

  it('gracefully handles dragId not present and insertAfter is null — prepends it', () => {
    expect(reinsert(['a', 'b', 'c'], 'x', null)).toEqual(['x', 'a', 'b', 'c']);
  });
});
