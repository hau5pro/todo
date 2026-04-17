import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('confetti utils', () => {
  beforeEach(() => {
    vi.resetModules();
  });
  describe('burstFromElement', () => {
    it('does nothing when window is undefined', async () => {
      const original = globalThis.window;
      // @ts-expect-error intentional
      delete globalThis.window;
      const { burstFromElement } = await import('../../utils/confetti');
      expect(() => burstFromElement(document.createElement('button'))).not.toThrow();
      globalThis.window = original;
    });

    it('calls confetti with origin derived from element bounds', async () => {
      const mockConfetti = vi.fn();
      vi.doMock('canvas-confetti', () => ({ default: mockConfetti }));
      const { burstFromElement } = await import('../../utils/confetti');

      const el = document.createElement('button');
      vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
        left: 100, top: 200, width: 24, height: 24,
        right: 124, bottom: 224, x: 100, y: 200, toJSON: () => {},
      });
      Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });

      burstFromElement(el);

      expect(mockConfetti).toHaveBeenCalledWith(expect.objectContaining({
        origin: { x: 0.112, y: 0.265 },
        particleCount: 30,
      }));
      vi.doUnmock('canvas-confetti');
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

    it('calls confetti twice with left and right origins', async () => {
      const mockConfetti = vi.fn();
      vi.doMock('canvas-confetti', () => ({ default: mockConfetti }));
      const { burstFullScreen } = await import('../../utils/confetti');

      burstFullScreen();

      expect(mockConfetti).toHaveBeenCalledTimes(2);
      expect(mockConfetti).toHaveBeenCalledWith(expect.objectContaining({ origin: { x: 0, y: 0.65 } }));
      expect(mockConfetti).toHaveBeenCalledWith(expect.objectContaining({ origin: { x: 1, y: 0.65 } }));
      vi.doUnmock('canvas-confetti');
    });
  });
});
