import confetti from 'canvas-confetti';

export function burstFromElement(el: HTMLElement): void {
  if (typeof window === 'undefined') return;
  const rect = el.getBoundingClientRect();
  confetti({
    origin: {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    },
    particleCount: 15,
    spread: 30,
    startVelocity: 12,
    ticks: 60,
  });
}

export function burstFullScreen(): void {
  if (typeof window === 'undefined') return;
  const pops: Array<{ x: number; y: number; v: number }> = [
    { x: 0.5,  y: 0.4,  v: 38 },
    { x: 0.22, y: 0.3,  v: 34 },
    { x: 0.78, y: 0.22, v: 30 },
  ];
  pops.forEach(({ x, y, v }, i) => {
    setTimeout(() => {
      confetti({ spread: 360, startVelocity: v, particleCount: 55, origin: { x, y }, gravity: 0.55, decay: 0.85, ticks: 130 });
    }, i * 100);
  });
}
