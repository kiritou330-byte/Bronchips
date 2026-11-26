"use client";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { useNavigation } from "@/state/navigation";
import { shared } from "../materials/shared";

/** Latest ground hit under the visitor's pointer (written by the island's pointer handler). */
export const pointerField = { target: new Vector3(0, -100, 0), lastMove: -10 };

/** Called from ground meshes on pointer move. */
export function touchGround(p: Vector3) {
  pointerField.target.copy(p);
  pointerField.lastMove = performance.now() / 1000;
}

/**
 * Smooths the ground pointer into shared uniforms: plants part while the finger/cursor
 * moves over them and settle back a moment after it stops — like brushing through a meadow.
 */
export function PointerField() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const now = performance.now() / 1000;
    const exploring = useNavigation.getState().phase === "explore";
    const recent = now - pointerField.lastMove < 0.25;
    const target = exploring && recent ? 1 : 0;
    // Rise quickly, release slowly.
    const k = target > shared.uPointerStrength.value ? 1 - Math.exp(-dt * 10) : 1 - Math.exp(-dt * 1.6);
    shared.uPointerStrength.value += (target - shared.uPointerStrength.value) * k;
    // Follow the finger softly; jump straight there when starting a new touch.
    if (shared.uPointerStrength.value < 0.02) shared.uPointer.value.copy(pointerField.target);
    else shared.uPointer.value.lerp(pointerField.target, 1 - Math.exp(-dt * 14));
  });
  return null;
}
