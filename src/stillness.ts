const RISE_SECONDS = 6;
const COLLAPSE_SECONDS = 0.25;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createStillness(reduced: boolean) {
  let raw = reduced ? 1 : 0;
  let lastInput = performance.now();
  let held = false;

  function disturb(): void {
    if (reduced) return;
    lastInput = performance.now();
  }

  function hold(active: boolean): void {
    held = active;
    if (active) disturb();
  }

  function update(dt: number): number {
    if (reduced) {
      raw = 1;
      return 1;
    }
    if (held) lastInput = performance.now();
    const elapsed = (performance.now() - lastInput) / 1000;
    const target = Math.min(1, elapsed / RISE_SECONDS);
    if (target < raw) {
      raw = Math.max(target, raw - dt / COLLAPSE_SECONDS);
    } else {
      raw = target;
    }
    return smoothstep(raw);
  }

  return { disturb, hold, update };
}

export type Stillness = ReturnType<typeof createStillness>;
