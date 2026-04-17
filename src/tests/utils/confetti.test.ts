import { describe, it, expect, vi } from 'vitest';

describe('confetti utils', () => {
  describe('burstFromElement', () => {
    it('does nothing when window is undefined', async () => {
      const original = globalThis.window;
      // @ts-expect-error intentional
      delete globalThis.window;
      const { burstFromElement } = await import('../../utils/confetti');
      expect(() => burstFromElement(document.createElement('button'))).not.toThrow();
      globalThis.window = original;
    });
  });

  describe('burstFullScreen', () => {
    it('does nothing when window is undefined', async () => {
      const original = globalThis.window;
      // @ts-expect-error intentional
      delete globalThis.window;
      const { burstFullScreen } = await import('../../utils/confetti');
      expect(() => burstFullScreen()).not.toThrow();
      globalThis.window = original;
    });
  });
});
