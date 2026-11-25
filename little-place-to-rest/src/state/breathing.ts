import { create } from "zustand";

/** Gentle rhythm: in for 4 s, out for 6 s. No holding — nothing to get right. */
export const INHALE = 4;
export const EXHALE = 6;
export const CYCLE = INHALE + EXHALE;

interface BreathingState {
  active: boolean;
  /** performance.now() / 1000 when the session began. */
  startedAt: number;
  /** Seconds, or null for "as long as I like". */
  duration: number | null;
  /** Set briefly after a timed session ends on its own. */
  finished: boolean;
  start: (duration: number | null) => void;
  stop: () => void;
  finish: () => void;
  clearFinished: () => void;
}

export const useBreathing = create<BreathingState>((set) => ({
  active: false,
  startedAt: 0,
  duration: null,
  finished: false,
  start: (duration) => set({ active: true, startedAt: performance.now() / 1000, duration, finished: false }),
  stop: () => set({ active: false }),
  finish: () => set({ active: false, finished: true }),
  clearFinished: () => set({ finished: false }),
}));

/** Where we are in the breath. `amount` is 0 (empty) .. 1 (full), eased. */
export function breathAt(elapsed: number) {
  const t = ((elapsed % CYCLE) + CYCLE) % CYCLE;
  if (t < INHALE) {
    const p = t / INHALE;
    return { phase: "in" as const, progress: p, amount: 0.5 - 0.5 * Math.cos(Math.PI * p) };
  }
  const p = (t - INHALE) / EXHALE;
  return { phase: "out" as const, progress: p, amount: 0.5 + 0.5 * Math.cos(Math.PI * p) };
}
