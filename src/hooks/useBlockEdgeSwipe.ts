import { useEffect } from 'react';

const EDGE_THRESHOLD = 20; // px from left edge to intercept

/**
 * Prevents the iOS PWA back-swipe gesture from triggering history navigation.
 * Intercepts touchstart events originating within EDGE_THRESHOLD px of the left
 * edge and calls preventDefault() if the subsequent move is primarily horizontal.
 */
export function useBlockEdgeSwipe() {
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let blocking = false;

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      blocking = startX < EDGE_THRESHOLD || startX > window.innerWidth - EDGE_THRESHOLD;
    }

    function onTouchMove(e: TouchEvent) {
      if (!blocking) return;
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = Math.abs(touch.clientY - startY);
      if (dx > dy && dx > 5) {
        e.preventDefault();
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);
}
