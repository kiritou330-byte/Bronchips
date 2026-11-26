"use client";

import { useFrame } from "@react-three/fiber";
import { sampleBands } from "@/lib/audio/engine";
import { useAudio } from "@/state/audio";
import { useWorld } from "@/state/world";
import { shared } from "../materials/shared";

/** Live, smoothed loudness for the DOM visualiser (read via rAF, never React state). */
export const audioMeter = { level: 0 };

const onset = { avg: 0, last: 0 };

/**
 * Music as weather, not a light show (after Fantasynth, turned right down):
 * - low  → the sky light breathes a few percent
 * - mid  → grass and flowers sway a little more
 * - high + beats → fireflies twinkle
 * - song progress → more petals drift down as the song goes on
 * Fast attack, slow release, everything capped.
 */
export function AudioReactive() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const b = sampleBands();
    const on = useWorld.getState().reactive;
    const smooth = (u: { value: number }, target: number, up: number, down: number) => {
      const k = target > u.value ? 1 - Math.exp(-dt * up) : 1 - Math.exp(-dt * down);
      u.value += (target - u.value) * k;
    };
    smooth(shared.uAudio, on ? Math.min(1, b.mid * 1.8) : 0, 6, 1.5);
    smooth(shared.uAudioLow, on ? Math.min(1, b.low * 0.8) : 0, 4, 1.2);
    smooth(shared.uAudioHigh, on ? Math.min(1, b.high * 2.5) : 0, 8, 2);

    // Simple beat detection on the low band: a rise well above its running average.
    const now = performance.now() / 1000;
    onset.avg += (b.low - onset.avg) * (1 - Math.exp(-dt * 1.5));
    if (on && b.low > 0.15 && b.low > onset.avg * 1.35 && now - onset.last > 0.28) {
      onset.last = now;
      shared.uAudioPulse.value = 1;
    }
    shared.uAudioPulse.value *= Math.exp(-dt * 4);

    // The garden slowly fills with drifting petals over the course of the song.
    const a = useAudio.getState();
    const progress = a.playing && a.duration > 0 ? a.currentTime / a.duration : 0;
    const petals = on && a.playing ? 0.7 + 0.3 * progress : 0.7;
    smooth(shared.uPetalAmount, petals, 0.5, 0.5);

    audioMeter.level += (Math.min(1, (b.low + b.mid) * 1.2) - audioMeter.level) * (1 - Math.exp(-dt * 10));
  });
  return null;
}
