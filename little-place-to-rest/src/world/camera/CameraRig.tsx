"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import { useEffect, useRef } from "react";
import { type PerspectiveCamera, Vector3 } from "three";
import { orbit as orbitCfg } from "@/config/world.config";
import { useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";
import { framing, orbitPosition, rig } from "./rig";

const look = new Vector3();
let snapRequested = false;
/** Debug/QA: jump the real camera onto the rig target on the next frame. */
export function snapCamera() {
  snapRequested = true;
}
const goal = new Vector3();
const lookGoal = new Vector3();

/**
 * Drives the real camera towards the rig target with critically damped springs,
 * and runs the orbit controller (drag / pinch / wheel with inertia and limits).
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const initialised = useRef(false);

  // Snap the real camera to the rig on first frame so we never start with a jump.
  useEffect(() => {
    camera.position.copy(rig.position);
    look.copy(rig.lookAt);
    camera.lookAt(look);
    camera.fov = rig.fov;
    camera.updateProjectionMatrix();
    initialised.current = true;
  }, [camera]);

  // --- Input -------------------------------------------------------------------------
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchDist = 0;
    let lastMoveT = 0;

    const canOrbit = () => rig.mode === "orbit" && useNavigation.getState().phase === "explore";

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      rig.orbit.dragging = canOrbit();
      rig.orbit.vAzimuth = 0;
      rig.orbit.vPolar = 0;
      rig.orbit.idle = 0;
    };

    const onMove = (e: PointerEvent) => {
      // Gentle parallax while holding the arrival shot (mouse only).
      if (e.pointerType === "mouse" && rig.mode === "cinematic") {
        rig.parallax.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1), 0);
      }
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;
      if (!canOrbit()) return;
      rig.orbit.idle = 0;
      if (pointers.size === 1) {
        const now = performance.now();
        const frameDt = Math.max(8, now - lastMoveT) / 16.67;
        lastMoveT = now;
        const da = -dx * orbitCfg.rotateSpeed;
        const dp = -dy * orbitCfg.rotateSpeed * 0.8;
        rig.orbit.azimuth += da;
        rig.orbit.polar = clampPolar(rig.orbit.polar + dp);
        // Velocity per 60 fps frame for inertia after release.
        rig.orbit.vAzimuth = da / frameDt;
        rig.orbit.vPolar = dp / frameDt;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) zoomBy(pinchDist / d);
        pinchDist = d;
      }
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) {
        rig.orbit.dragging = false;
        // Ignore stale velocity if the pointer rested before release.
        if (performance.now() - lastMoveT > 90) {
          rig.orbit.vAzimuth = 0;
          rig.orbit.vPolar = 0;
        }
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!canOrbit()) return;
      e.preventDefault();
      rig.orbit.idle = 0;
      zoomBy(Math.exp(e.deltaY * 0.0012));
    };

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  // --- Per-frame ---------------------------------------------------------------------
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const reduced = useWorld.getState().reducedMotion;
    rig.reducedMotion = reduced;
    const o = rig.orbit;

    if (rig.mode === "orbit") {
      o.idle += dt;
      if (!o.dragging) {
        // Inertia, frame-rate independent.
        const decay = Math.pow(orbitCfg.inertia, dt * 60);
        o.azimuth += o.vAzimuth * dt * 60;
        o.polar = clampPolar(o.polar + o.vPolar * dt * 60);
        o.vAzimuth *= decay;
        o.vPolar *= decay;
        // Soft polar spring back inside limits.
      }
      // When left alone for a while the camera drifts very slowly, like a held breath.
      const drift = reduced ? 0 : Math.min(1, Math.max(0, (o.idle - 6) / 4));
      o.azimuth += drift * dt * 0.018;
      const f = framing();
      orbitPosition(o.azimuth, o.polar, o.distance * f.distMul, o.center, rig.position);
      rig.lookAt.copy(o.center);
      rig.fov = orbitCfg.fov + f.fovAdd;
    }

    goal.copy(rig.position);
    lookGoal.copy(rig.lookAt);
    if (rig.mode === "cinematic" && rig.parallaxAmount > 0 && !reduced) {
      goal.x += rig.parallax.x * rig.parallaxAmount;
      goal.y += rig.parallax.y * rig.parallaxAmount * 0.5;
    }
    // Subtle handheld breathing on cinematic shots.
    if (rig.mode === "cinematic" && !reduced) {
      const t = state.clock.elapsedTime;
      goal.y += Math.sin(t * 0.5) * 0.06;
      goal.x += Math.sin(t * 0.31 + 1.3) * 0.05;
    }

    if (snapRequested) {
      snapRequested = false;
      camera.position.copy(goal);
      look.copy(lookGoal);
      camera.fov = rig.fov;
      camera.updateProjectionMatrix();
    }
    easing.damp3(camera.position, goal, rig.smooth, dt);
    easing.damp3(look, lookGoal, rig.smooth * 0.9, dt);
    camera.lookAt(look);
    if (Math.abs(camera.fov - rig.fov) > 0.01) {
      easing.damp(camera, "fov", rig.fov, 0.5, dt);
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function clampPolar(p: number) {
  return Math.min(orbitCfg.polar.max, Math.max(orbitCfg.polar.min, p));
}

function zoomBy(factor: number) {
  const o = rig.orbit;
  o.distance = Math.min(orbitCfg.distance.max, Math.max(orbitCfg.distance.min, o.distance * factor));
}
