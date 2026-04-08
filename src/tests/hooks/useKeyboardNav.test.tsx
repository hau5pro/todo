import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import { TaskDetailProvider } from '../../contexts/TaskDetailContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <TaskDetailProvider>{children}</TaskDetailProvider>;
}

function fireKey(key: string, opts: KeyboardEventInit = {}) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
  });
}

function makeNavRow(id = 'row-1'): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-nav-row', '');
  el.setAttribute('tabindex', '0');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function makeNavItem(active = false, id = 'nav-1'): HTMLElement {
  const el = document.createElement('button');
  el.setAttribute('data-nav-item', '');
  el.id = id;
  if (active) el.classList.add('nav-item--active');
  document.body.appendChild(el);
  return el;
}

function cleanup(...els: HTMLElement[]) {
  els.forEach((el) => el.remove());
}

describe('useKeyboardNav', () => {
  it('Tab with nothing focused moves focus to active nav item', () => {
    const navItem = makeNavItem(true);
    renderHook(() => useKeyboardNav(), { wrapper });

    // nothing focused
    (document.activeElement as HTMLElement)?.blur?.();
    fireKey('Tab');

    expect(document.activeElement).toBe(navItem);
    cleanup(navItem);
  });

  it('ArrowDown on a nav row moves focus to the next row', () => {
    const row1 = makeNavRow('row-1');
    const row2 = makeNavRow('row-2');
    renderHook(() => useKeyboardNav(), { wrapper });

    row1.focus();
    expect(document.activeElement).toBe(row1);
    fireKey('ArrowDown');
    expect(document.activeElement).toBe(row2);

    cleanup(row1, row2);
  });

  it('ArrowUp on a nav row moves focus to the previous row', () => {
    const row1 = makeNavRow('row-a');
    const row2 = makeNavRow('row-b');
    renderHook(() => useKeyboardNav(), { wrapper });

    row2.focus();
    fireKey('ArrowUp');
    expect(document.activeElement).toBe(row1);

    cleanup(row1, row2);
  });

  it('ArrowDown on last nav row wraps to first', () => {
    const row1 = makeNavRow('wrap-1');
    const row2 = makeNavRow('wrap-2');
    renderHook(() => useKeyboardNav(), { wrapper });

    row2.focus();
    fireKey('ArrowDown');
    expect(document.activeElement).toBe(row1);

    cleanup(row1, row2);
  });

  it('ArrowUp on first nav row wraps to last', () => {
    const row1 = makeNavRow('wrap-a');
    const row2 = makeNavRow('wrap-b');
    renderHook(() => useKeyboardNav(), { wrapper });

    row1.focus();
    fireKey('ArrowUp');
    expect(document.activeElement).toBe(row2);

    cleanup(row1, row2);
  });

  it('Space on a nav row clicks its .animated-checkbox child', () => {
    const row = makeNavRow('space-row');
    const checkbox = document.createElement('button');
    checkbox.className = 'animated-checkbox';
    let clicked = false;
    checkbox.addEventListener('click', () => { clicked = true; });
    row.appendChild(checkbox);
    renderHook(() => useKeyboardNav(), { wrapper });

    row.focus();
    fireKey(' ');

    expect(clicked).toBe(true);
    cleanup(row);
  });

  it('ArrowDown in sidebar cycles nav items', () => {
    // Build a sidebar containing nav items
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    const item1 = document.createElement('button');
    item1.setAttribute('data-nav-item', '');
    const item2 = document.createElement('button');
    item2.setAttribute('data-nav-item', '');
    sidebar.appendChild(item1);
    sidebar.appendChild(item2);
    document.body.appendChild(sidebar);

    renderHook(() => useKeyboardNav(), { wrapper });

    item1.focus();
    fireKey('ArrowDown');
    expect(document.activeElement).toBe(item2);

    sidebar.remove();
  });

  it('ArrowUp in sidebar cycles nav items upward', () => {
    const sidebar = document.createElement('div');
    sidebar.className = 'sidebar';
    const item1 = document.createElement('button');
    item1.setAttribute('data-nav-item', '');
    const item2 = document.createElement('button');
    item2.setAttribute('data-nav-item', '');
    sidebar.appendChild(item1);
    sidebar.appendChild(item2);
    document.body.appendChild(sidebar);

    renderHook(() => useKeyboardNav(), { wrapper });

    item2.focus();
    fireKey('ArrowUp');
    expect(document.activeElement).toBe(item1);

    sidebar.remove();
  });
});
