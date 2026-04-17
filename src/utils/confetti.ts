import confetti from 'canvas-confetti';

export function burstFromElement(el: HTMLElement): void {
  if (typeof window === 'undefined') return;
  const rect = el.getBoundingClientRect();
  confetti({
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    particleCount: 30,
    spread: 60,
    startVelocity: 20,
    ticks: 80,
  });
}

export function burstFullScreen(): void {
  if (typeof window === 'undefined') return;
  confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.65 } });
  confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.65 } });
}
