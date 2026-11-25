"use client";

import { useFrame } from "@react-three/fiber";
import { sampleLevel } from "@/lib/audio/engine";
import { useWorld } from "@/state/world";
import { shared } from "../materials/shared";

/** Live, smoothed loudness for the DOM visualiser (read via rAF, never React state). */
export const audioMeter = { level: 0 };

/**
 * Feeds a very gently smoothed music level into the world. Fast attack, slow release,
 * capped — the world breathes with the song, it never flashes.
 */
export function AudioReactive() {
  useFrame((_, dt) => {
    const raw = sampleLevel();
    const target = useWorld.getState().reactive ? Math.min(1, raw * 1.6) : 0;
    const k = target > shared.uAudio.value ? 1 - Math.exp(-dt * 6) : 1 - Math.exp(-dt * 1.5);
    shared.uAudio.value += (target - shared.uAudio.value) * k;
    audioMeter.level += (Math.min(1, raw * 2) - audioMeter.level) * (1 - Math.exp(-dt * 10));
  });
  return null;
}
