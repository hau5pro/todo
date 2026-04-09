import { useState, useRef, useEffect, useCallback } from 'react';
import { reinsert } from '../utils/order';

interface UseLineDragOptions {
  scrollRef: React.RefObject<HTMLElement | null>;
  onCommit: (dragId: string, context: string, newIds: string[]) => void;
}

interface UseLineDragReturn {
  dragId: string | null;
  startDrag: (e: React.PointerEvent, itemId: string, context: string, draggingClass?: string) => void;
  ghostRef: React.RefObject<HTMLDivElement | null>;
  lineRef: React.RefObject<HTMLDivElement | null>;
}

export function useLineDrag({ scrollRef, onCommit }: UseLineDragOptions): UseLineDragReturn {
  const [dragId, setDragId] = useState<string | null>(null);
  const contextRef = useRef<string | null>(null);
  const draggingClassRef = useRef<string | undefined>(undefined);
  const insertAfterRef = useRef<string | null>(null);
  const itemsRef = useRef<{ id: string; el: HTMLElement }[]>([]);
  const ghostRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const pointerYRef = useRef<number>(0);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  const startDrag = useCallback((
    e: React.PointerEvent,
    itemId: string,
    context: string,
    draggingClass?: string,
  ) => {
    e.preventDefault();
    contextRef.current = context;
    draggingClassRef.current = draggingClass;
    setDragId(itemId);
  }, []);

  useEffect(() => {
    if (!dragId) return;
    const context = contextRef.current;
    if (!context) return;

    const group = document.querySelector(`[data-reorder-context="${context}"]`);
    if (!group) return;

    itemsRef.current = Array.from(group.children)
      .filter((el): el is HTMLElement => el instanceof HTMLElement && el.hasAttribute('data-reorder-id'))
      .map((el) => ({ id: el.getAttribute('data-reorder-id')!, el }));

    const draggedEl = group.querySelector<HTMLElement>(`[data-reorder-id="${dragId}"]`);
    const cls = draggingClassRef.current;
    if (cls && draggedEl) draggedEl.classList.add(cls);

    const rafId = { current: 0 };
    function edgeScrollLoop() {
      const scrollEl = scrollRef.current;
      if (scrollEl) {
        const { top, bottom } = scrollEl.getBoundingClientRect();
        const y = pointerYRef.current;
        const ZONE = 64, MAX = 14;
        if (y > top && y < top + ZONE)
          scrollEl.scrollTop -= MAX * (1 - (y - top) / ZONE);
        else if (y > bottom - ZONE && y < bottom)
          scrollEl.scrollTop += MAX * (1 - (bottom - y) / ZONE);
      }
      rafId.current = requestAnimationFrame(edgeScrollLoop);
    }
    rafId.current = requestAnimationFrame(edgeScrollLoop);

    function onMove(e: PointerEvent) {
      pointerYRef.current = e.clientY;
      if (ghostRef.current) {
        ghostRef.current.style.display = 'flex';
        ghostRef.current.style.left = `${e.clientX + 14}px`;
        ghostRef.current.style.top = `${e.clientY + 10}px`;
      }

      const items = itemsRef.current;
      let insertAfter: string | null = '__start__';
      for (const { id, el } of items) {
        if (id === dragId) continue;
        const rect = el.getBoundingClientRect();
        if (e.clientY > rect.top + rect.height / 2) insertAfter = id;
      }
      insertAfterRef.current = insertAfter;

      if (lineRef.current && items.length > 1) {
        let lineY: number | null = null;
        if (insertAfter === '__start__') {
          const first = items.find(({ id }) => id !== dragId);
          if (first) lineY = first.el.getBoundingClientRect().top;
        } else {
          const after = items.find(({ id }) => id === insertAfter);
          if (after) lineY = after.el.getBoundingClientRect().bottom;
        }
        if (lineY !== null) {
          const groupRect = group!.getBoundingClientRect();
          lineRef.current.style.opacity = '1';
          lineRef.current.style.top = `${lineY}px`;
          lineRef.current.style.left = `${groupRect.left + 4}px`;
          lineRef.current.style.width = `${groupRect.width - 8}px`;
        }
      }
    }

    function cleanup() {
      if (cls && draggedEl) draggedEl.classList.remove(cls);
      if (ghostRef.current) ghostRef.current.style.display = 'none';
      if (lineRef.current) lineRef.current.style.opacity = '0';
      itemsRef.current = [];
      insertAfterRef.current = null;
    }

    function onUp() {
      const newIds = reinsert(
        itemsRef.current.map(({ id }) => id),
        dragId!,
        insertAfterRef.current,
      );
      onCommitRef.current(dragId!, context!, newIds);
      cleanup();
      setDragId(null);
    }

    function onCancel() {
      cleanup();
      setDragId(null);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      cleanup();
    };
  }, [dragId]);

  return { dragId, startDrag, ghostRef, lineRef };
}
