import { create } from "zustand";

/**
 * Where the visitor is in the experience. All "scenes" live in one persistent world;
 * a phase decides the camera mode and which UI is shown.
 */
export type Phase = "arrival" | "entering" | "explore" | "pond" | "cottage" | "letter" | "lookout";

/** Places reachable from the navigation bar. */
export type Destination = "garden" | "pond" | "cottage" | "lookout";

interface NavigationState {
  phase: Phase;
  /** Shaders compiled and the first frames rendered — the arrival may begin. */
  ready: boolean;
  /** True while a camera transition is running (UI can wait for it). */
  transitioning: boolean;
  /** The letter page is on screen. */
  letterOpen: boolean;
  setLetterOpen: (v: boolean) => void;
  setPhase: (phase: Phase) => void;
  setReady: () => void;
  setTransitioning: (v: boolean) => void;
}

export const useNavigation = create<NavigationState>((set) => ({
  phase: "arrival",
  ready: false,
  transitioning: false,
  letterOpen: false,
  setLetterOpen: (letterOpen) => set({ letterOpen }),
  setPhase: (phase) => set({ phase }),
  setReady: () => set({ ready: true }),
  setTransitioning: (transitioning) => set({ transitioning }),
}));

export function destinationOf(phase: Phase): Destination | null {
  if (phase === "explore") return "garden";
  if (phase === "pond") return "pond";
  if (phase === "cottage" || phase === "letter") return "cottage";
  if (phase === "lookout") return "lookout";
  return null;
}
