import type { Quality } from "@/state/world";

/** Per-tier budgets. Medium is the mid-range phone target. */
export interface QualitySettings {
  dpr: [number, number];
  shadows: boolean;
  shadowMapSize: number;
  grass: number;
  flowers: number;
  dust: number;
  fireflies: number;
  postfx: "none" | "light" | "full";
  /** Icosphere subdivision for tree canopies. */
  foliageDetail: number;
  msaa: number;
}

export const qualitySettings: Record<Quality, QualitySettings> = {
  low: {
    dpr: [1, 1.25],
    shadows: false,
    shadowMapSize: 512,
    grass: 4500,
    flowers: 220,
    dust: 110,
    fireflies: 40,
    postfx: "none",
    msaa: 0,
    foliageDetail: 3,
  },
  medium: {
    dpr: [1, 1.5],
    shadows: true,
    shadowMapSize: 1024,
    grass: 11000,
    flowers: 420,
    dust: 200,
    fireflies: 70,
    postfx: "light",
    msaa: 0,
    foliageDetail: 3,
  },
  high: {
    dpr: [1, 2],
    shadows: true,
    shadowMapSize: 2048,
    grass: 22000,
    flowers: 700,
    dust: 300,
    fireflies: 90,
    postfx: "full",
    msaa: 4,
    foliageDetail: 4,
  },
};

/** Best guess before any frame is measured. Refined at runtime by PerformanceMonitor. */
export function detectInitialQuality(): Quality {
  if (typeof window === "undefined") return "medium";
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("quality");
  if (forced === "low" || forced === "medium" || forced === "high") return forced;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  if (coarse || small) return memory <= 3 || cores <= 4 ? "low" : "medium";
  return cores >= 8 ? "high" : "medium";
}
