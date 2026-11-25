import { create } from "zustand";

/**
 * Where the visitor is in the experience. All "scenes" live in one persistent world;
 * a phase decides the camera mode and which UI is shown.
 */
export type Phase = "arrival" | "entering" | "explore";

interface NavigationState {
  phase: Phase;
  /** Shaders compiled and the first frames rendered — the arrival may begin. */
  ready: boolean;
  /** True while a camera transition is running (UI can wait for it). */
  transitioning: boolean;
  setPhase: (phase: Phase) => void;
  setReady: () => void;
  setTransitioning: (v: boolean) => void;
}

export const useNavigation = create<NavigationState>((set) => ({
  phase: "arrival",
  ready: false,
  transitioning: false,
  setPhase: (phase) => set({ phase }),
  setReady: () => set({ ready: true }),
  setTransitioning: (transitioning) => set({ transitioning }),
}));
