// Named easing curves for use with framer-motion's `ease` option
export const ease = {
  out:     [0, 0, 0.2, 1]     as const,  // smooth deceleration (most UI motion)
  in:      [0.4, 0, 1, 1]     as const,  // acceleration (exit/wipe)
  inOut:   [0.4, 0, 0.2, 1]   as const,  // symmetric
  snap:    [0, 0.9, 0.57, 1]  as const,  // springy snap-out (panels, drawers)
  bounce:  [0.34, 1.56, 0.64, 1] as const, // overshoot bounce (celebratory entrances)
  wipe:    [0.4, 0, 0.8, 1]   as const,  // task completion wipe
} as const;
