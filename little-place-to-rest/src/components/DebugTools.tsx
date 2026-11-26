"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { type PerspectiveCamera, Vector3 } from "three";
import { layout } from "@/config/world.config";
import { islandHeight } from "@/lib/three/terrain";
import type { TimeOfDay } from "@/config/world.config";
import { useNavigation } from "@/state/navigation";
import { type Quality, useWorld } from "@/state/world";
import { snapCamera } from "@/world/camera/CameraRig";
import { cottageToWorld } from "@/world/locations";
import { butterflyPositions } from "@/world/objects/Butterflies";
import { pointerField, touchGround } from "@/world/environment/PointerField";
import { shared } from "@/world/materials/shared";
import { enterOrbit, flyTo, initialExploreShot, rig, setShot } from "@/world/camera/rig";
import { enterWorld } from "@/world/director";

/** Exposes a small API on window.__lpr for automated visual QA (only with ?debug). */
export function DebugBridge() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    // The sandbox renders at ~1 fps; without this GSAP would crawl (lag smoothing).
    gsap.ticker.lagSmoothing(0);
    const api = {
      scene,
      /** Screen position (CSS px) of any world point. */
      screenOf: (x: number, y: number, z: number) => {
        const v = new Vector3(x, y, z).project(camera);
        return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
      },
      audio: () => ({
        mid: +shared.uAudio.value.toFixed(3),
        low: +shared.uAudioLow.value.toFixed(3),
        high: +shared.uAudioHigh.value.toFixed(3),
        pulse: +shared.uAudioPulse.value.toFixed(3),
        petals: +shared.uPetalAmount.value.toFixed(3),
      }),
      /** Hold the "finger" on the ground at (x, z) — for stills of the meadow parting. */
      pointerAt: (x: number, z: number) => {
        touchGround(new Vector3(x, islandHeight(x, z), z));
        pointerField.lastMove = 1e12;
      },
      /** World point along the camera ray through NDC (nx, ny) at a given distance. */
      skyPoint: (nx: number, ny: number, dist: number) => {
        const d = new Vector3(nx, ny, 0.5).unproject(camera).sub(camera.position).normalize();
        return camera.position.clone().addScaledVector(d, dist).toArray().map((v) => +v.toFixed(2));
      },
      worldScreen: (x: number, y: number, z: number) => {
        const v = new Vector3(x, y, z).project(camera);
        return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
      },
      groundScreen: (x: number, z: number, dy = 0.15) => {
        const v = new Vector3(x, islandHeight(x, z) + dy, z).project(camera);
        return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
      },
      envelopeScreen: () => {
        const v = new Vector3(...cottageToWorld(-0.2, 0.53, -0.48)).project(camera);
        return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
      },
      butterflyScreen: (i: number) => {
        const v = butterflyPositions[i].clone().project(camera);
        return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
      },
      /** Screen position (CSS px) of an interactive flower head. */
      flowerScreen: (i: number) => {
        const f = layout.interactiveFlowers[i];
        const v = new Vector3(f.position[0], islandHeight(f.position[0], f.position[1]) + 0.85, f.position[1]);
        v.project(camera);
        return [((v.x + 1) / 2) * window.innerWidth, ((1 - v.y) / 2) * window.innerHeight];
      },
      gl,
      rig,
      setTime: (t: TimeOfDay) => useWorld.getState().setTimeOfDay(t),
      setQuality: (q: Quality) => useWorld.getState().setQuality(q, true),
      enter: enterWorld,
      /** Skip straight to exploring with the camera already in place. */
      skip: () => {
        setShot(initialExploreShot());
        enterOrbit();
        camera.position.copy(rig.position);
        useNavigation.getState().setPhase("explore");
      },
      orbit: (azimuth: number, polar: number, distance: number) => {
        rig.orbit.azimuth = azimuth;
        rig.orbit.polar = polar;
        rig.orbit.distance = distance;
        rig.orbit.vAzimuth = rig.orbit.vPolar = 0;
      },
      shot: (position: [number, number, number], target: [number, number, number], fov = 40) => {
        setShot({ position, target, fov });
      },
      fly: flyTo,
      snap: snapCamera,
      /** Finish any running camera tween instantly (QA stills). */
      finish: () => {
        rig.tween?.progress(1);
        snapCamera();
      },
      info: () => ({ calls: gl.info.render.calls, triangles: gl.info.render.triangles, programs: gl.info.programs?.length }),
      state: () => ({ nav: useNavigation.getState().phase, world: useWorld.getState() }),
      ready: () => useNavigation.getState().ready,
    };
    (window as unknown as { __lpr: typeof api }).__lpr = api;
  }, [camera, gl, scene]);
  return null;
}

/** Minimal FPS / draw-call readout for testing on real phones. */
export function DebugStats() {
  const gl = useThree((s) => s.gl);
  const el = useRef<HTMLDivElement | null>(null);
  const acc = useRef({ frames: 0, time: 0 });

  useEffect(() => {
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed;left:8px;bottom:8px;z-index:9999;font:11px/1.35 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.45);padding:4px 7px;border-radius:6px;pointer-events:none;white-space:pre";
    document.body.appendChild(d);
    el.current = d;
    return () => d.remove();
  }, []);

  useFrame((_, dt) => {
    const a = acc.current;
    a.frames++;
    a.time += dt;
    if (a.time >= 0.5 && el.current) {
      const fps = Math.round(a.frames / a.time);
      el.current.textContent = `${fps} fps · ${gl.info.render.calls} calls · ${(gl.info.render.triangles / 1000).toFixed(0)}k tris · ${useWorld.getState().quality} · dpr ${gl.getPixelRatio().toFixed(2)}`;
      a.frames = 0;
      a.time = 0;
    }
  });
  return null;
}
