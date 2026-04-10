import { useEffect, useRef } from 'react';
import { useTaskDetail } from '../contexts/TaskDetailContext';

const ROW_SELECTOR = '[data-nav-row], [data-add-task]';

export function useKeyboardNav() {
  const { detail, close: closeDetail } = useTaskDetail();
  const lastNavRow = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;

      // Fresh load: Tab with nothing focused → jump straight to active nav item
      if ((!active || active === document.body) && e.key === 'Tab') {
        e.preventDefault();
        const navActive =
          document.querySelector<HTMLElement>('[data-nav-item].nav-item--active') ??
          document.querySelector<HTMLElement>('[data-nav-item]');
        navActive?.focus();
        return;
      }

      const isNavRow = active?.hasAttribute('data-nav-row');
      const isAddTask = active?.hasAttribute('data-add-task');
      const inSidebar = !!document.querySelector('.sidebar')?.contains(active);
      const inDetailPanel = !!document.querySelector('.task-detail-panel')?.contains(active);

      // ── Detail panel ──────────────────────────────────────
      if (inDetailPanel) {
        if (e.key === 'Escape') {
          closeDetail();
          lastNavRow.current?.focus();
          return;
        }
        if (e.key === 'Tab') {
          // safe: inDetailPanel already confirmed .task-detail-panel contains active
          const panel = document.querySelector('.task-detail-panel')!;
          const focusable = Array.from(
            panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')
          );
          // safe: active is non-null — inDetailPanel check confirmed it
          const idx = focusable.indexOf(active!);
          e.preventDefault();
          focusable[!e.shiftKey
            ? (idx < focusable.length - 1 ? idx + 1 : 0)
            : (idx > 0 ? idx - 1 : focusable.length - 1)
          ]?.focus();
        }
        return;
      }

      // ── Sidebar ───────────────────────────────────────────
      if (inSidebar) {
        // Don't intercept while renaming
        if (active?.tagName === 'INPUT') return;

        const navItems = Array.from(
          document.querySelectorAll<HTMLElement>('[data-nav-item]')
        );
        const isNavItem = active?.hasAttribute('data-nav-item');
        // safe: active is non-null — inSidebar check confirmed it
        const idx = isNavItem ? navItems.indexOf(active!) : -1;

        if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
          e.preventDefault();
          navItems[idx < navItems.length - 1 ? idx + 1 : 0]?.focus();
        } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
          e.preventDefault();
          navItems[idx > 0 ? idx - 1 : navItems.length - 1]?.focus();
        } else if ((e.key === 'Enter' || e.key === 'ArrowRight') && isNavItem) {
          // safe: active is non-null — inSidebar check confirmed it
          active!.click();
          setTimeout(() => {
            const target =
              document.querySelector<HTMLElement>('[data-nav-row]') ??
              document.querySelector<HTMLElement>('[data-add-task]');
            target?.focus();
          }, 50);
        }
        return;
      }

      // ── Main content rows + add-task input ────────────────
      if (isNavRow || isAddTask) {
        // For the add-task input, only handle Tab — let all other keys type normally
        if (isAddTask && e.key !== 'Tab') return;
        // For other inputs (shouldn't exist here, but safety)
        if (!isNavRow && !isAddTask) return;

        const items = Array.from(document.querySelectorAll<HTMLElement>(ROW_SELECTOR));
        // safe: active is non-null — isNavRow / isAddTask checks confirmed it
        const idx = items.indexOf(active!);

        if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
          e.preventDefault();
          items[idx < items.length - 1 ? idx + 1 : 0]?.focus();
        } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
          e.preventDefault();
          items[idx > 0 ? idx - 1 : items.length - 1]?.focus();
        } else if (e.key === ' ') {
          e.preventDefault();
          // safe: active is non-null — isNavRow / isAddTask checks confirmed it
          active!.querySelector<HTMLElement>('.animated-checkbox')?.click();
        } else if (e.key === 'Enter' && isNavRow) {
          lastNavRow.current = active;
          // safe: active is non-null — isNavRow / isAddTask checks confirmed it
          active!.click();
        } else if (e.key === 'Escape') {
          if (detail) {
            closeDetail();
            lastNavRow.current?.focus();
          } else {
            const navActive =
              document.querySelector<HTMLElement>('[data-nav-item].nav-item--active') ??
              document.querySelector<HTMLElement>('[data-nav-item]');
            navActive?.focus();
          }
        } else if (e.key === 'ArrowLeft') {
          const navActive =
            document.querySelector<HTMLElement>('[data-nav-item].nav-item--active') ??
            document.querySelector<HTMLElement>('[data-nav-item]');
          navActive?.focus();
        }
        return;
      }

      // ── Global ────────────────────────────────────────────
      if (e.key === 'Escape' && detail) {
        closeDetail();
        lastNavRow.current?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detail, closeDetail]);
}
