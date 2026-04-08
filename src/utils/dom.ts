import type { RefObject } from 'react';

/** Schedule focus on a ref's element after the current paint cycle. */
export function focusLater(ref: RefObject<HTMLElement | null>, delay = 50) {
  setTimeout(() => ref.current?.focus(), delay);
}
