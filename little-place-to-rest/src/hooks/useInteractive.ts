"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useCallback, useEffect, useState } from "react";
import { type Phase, useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";

/** Pixels the pointer may travel between down and up and still count as a tap (not a drag). */
const TAP_SLOP = 8;

/**
 * Shared behaviour for touchable objects: pointer cursor on hover, tap-vs-drag detection,
 * and interaction only while the visitor is exploring.
 */
export function useInteractive(
  onTap: (e: ThreeEvent<MouseEvent>) => void,
  enabled = true,
  phases: Phase[] = ["explore"],
) {
  const [hovered, setHovered] = useState(false);
  const phase = useNavigation((s) => s.phase);
  const transitioning = useNavigation((s) => s.transitioning);
  const active = enabled && !transitioning && phases.includes(phase);

  useEffect(() => {
    if (!active && hovered) setHovered(false);
  }, [active, hovered]);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const bind = {
    onPointerOver: useCallback(
      (e: ThreeEvent<PointerEvent>) => {
        if (!active) return;
        e.stopPropagation();
        setHovered(true);
      },
      [active],
    ),
    onPointerOut: useCallback(() => setHovered(false), []),
    onClick: useCallback(
      (e: ThreeEvent<MouseEvent>) => {
        if (!active || e.delta > TAP_SLOP) return;
        e.stopPropagation();
        useWorld.getState().dismissHint();
        onTap(e);
      },
      [active, onTap],
    ),
  };

  return { hovered, active, bind };
}
