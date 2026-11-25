import { create } from "zustand";
import { defaultTimeOfDay, type TimeOfDay } from "@/config/world.config";

export type Quality = "low" | "medium" | "high";

export interface WorldMessage {
  id: number;
  text: string;
}

interface WorldState {
  timeOfDay: TimeOfDay;
  quality: Quality;
  /** Set when the visitor picks a quality by hand; disables automatic changes. */
  qualityLocked: boolean;
  reducedMotion: boolean;
  message: WorldMessage | null;
  /** Ids of things the visitor has touched (bloomed flowers, surprises found...). */
  touched: Record<string, true>;
  /** Hint is hidden after the first real interaction. */
  hintDismissed: boolean;
  setTimeOfDay: (t: TimeOfDay) => void;
  setQuality: (q: Quality, locked?: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  showMessage: (text: string) => void;
  clearMessage: (id: number) => void;
  touch: (id: string) => void;
  dismissHint: () => void;
}

let messageId = 0;

export const useWorld = create<WorldState>((set, get) => ({
  timeOfDay: defaultTimeOfDay,
  quality: "medium",
  qualityLocked: false,
  reducedMotion: false,
  message: null,
  touched: {},
  hintDismissed: false,
  setTimeOfDay: (timeOfDay) => set({ timeOfDay }),
  setQuality: (quality, locked = false) => set({ quality, qualityLocked: locked || get().qualityLocked }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  showMessage: (text) => set({ message: { id: ++messageId, text } }),
  clearMessage: (id) => {
    if (get().message?.id === id) set({ message: null });
  },
  touch: (id) => set((s) => ({ touched: { ...s.touched, [id]: true } })),
  dismissHint: () => set({ hintDismissed: true }),
}));
