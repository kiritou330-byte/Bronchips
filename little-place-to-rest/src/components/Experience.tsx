"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { NeutralToneMapping, SRGBColorSpace } from "three";
import { detectInitialQuality, qualitySettings } from "@/config/quality.config";
import { shots } from "@/config/world.config";
import { useAudio } from "@/state/audio";
import { useNavigation } from "@/state/navigation";
import { type Quality, useWorld } from "@/state/world";
import { CameraRig } from "@/world/camera/CameraRig";
import { setShot } from "@/world/camera/rig";
import { startArrival } from "@/world/director";
import { PostFX } from "@/world/effects/PostFX";
import { World } from "@/world/World";
import { DebugBridge, DebugStats } from "./DebugTools";
import { Overlay } from "./ui/Overlay";
import { WebGLFallback } from "./ui/WebGLFallback";

// Rig starts at the first arrival frame so the very first render is already composed.
setShot(shots.arrivalStart);

/** Compile every shader up-front, render a couple of frames, then begin the arrival. */
function Warmup() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const frames = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    gl.compile(scene, camera);
  }, [gl, scene, camera]);

  useFrame(() => {
    if (started.current) return;
    frames.current++;
    if (frames.current === 3) {
      started.current = true;
      useNavigation.getState().setReady();
      startArrival();
    }
  });
  return null;
}

const ORDER: Quality[] = ["low", "medium", "high"];

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Experience({ musicAvailable }: { musicAvailable: boolean }) {
  const quality = useWorld((s) => s.quality);
  const settings = qualitySettings[quality];
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    setWebgl(hasWebGL());
    setDebug(new URLSearchParams(window.location.search).has("debug"));
    const forced = new URLSearchParams(window.location.search).has("quality");
    useWorld.getState().setQuality(detectInitialQuality(), forced);
    useAudio.getState().setAvailability(musicAvailable ? "available" : "missing");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => useWorld.getState().setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [musicAvailable]);

  if (webgl === null) return <div className="fixed inset-0 bg-[var(--bg)]" />;
  if (!webgl) return <WebGLFallback />;

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--bg)]">
      <Canvas
        className="!touch-none"
        shadows={settings.shadows ? "percentage" : false}
        dpr={settings.dpr}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false }}
        camera={{ fov: shots.arrivalStart.fov, near: 0.1, far: 900, position: shots.arrivalStart.position }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping;
          gl.outputColorSpace = SRGBColorSpace;
        }}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            const w = useWorld.getState();
            if (w.qualityLocked || !useNavigation.getState().ready) return;
            const i = ORDER.indexOf(w.quality);
            if (i > 0) w.setQuality(ORDER[i - 1]);
          }}
        />
        <Suspense fallback={null}>
          <World quality={quality} settings={settings} />
          <Warmup />
        </Suspense>
        <CameraRig />
        <PostFX settings={settings} />
        {debug && <DebugBridge />}
        {debug && <DebugStats />}
      </Canvas>
      <Overlay />
    </div>
  );
}
