import { create } from "zustand";
import { music } from "@/config/audio.config";

export type AudioAvailability = "checking" | "available" | "missing";

interface AudioState {
  availability: AudioAvailability;
  /** The visitor's choice on the arrival screen. */
  wantsMusic: boolean;
  playing: boolean;
  volume: number;
  muted: boolean;
  /** Seconds. */
  currentTime: number;
  duration: number;
  /** 0..1 smoothed loudness for gentle music-reactive visuals. */
  level: number;
  setAvailability: (a: AudioAvailability) => void;
  setWantsMusic: (v: boolean) => void;
  setPlaying: (v: boolean) => void;
  setVolume: (v: number) => void;
  setMuted: (v: boolean) => void;
  setProgress: (currentTime: number, duration: number) => void;
}

export const useAudio = create<AudioState>((set) => ({
  availability: "checking",
  wantsMusic: true,
  playing: false,
  volume: music.volume,
  muted: false,
  currentTime: 0,
  duration: 0,
  level: 0,
  setAvailability: (availability) => set({ availability }),
  setWantsMusic: (wantsMusic) => set({ wantsMusic }),
  setPlaying: (playing) => set({ playing }),
  setVolume: (volume) => set({ volume }),
  setMuted: (muted) => set({ muted }),
  setProgress: (currentTime, duration) => set({ currentTime, duration }),
}));
