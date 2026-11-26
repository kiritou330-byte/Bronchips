"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, type ReactNode, Suspense, useEffect, useRef, useState } from "react";
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

/** If anything in the 3D world throws, fall back to the gentle 2D page instead of a blank screen. */
class WorldBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

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
  // While the letter covers the screen the world doesn't need to keep rendering.
  const letterOpen = useNavigation((s) => s.letterOpen);

  useEffect(() => {
    setWebgl(hasWebGL());
    setDebug(new URLSearchParams(window.location.search).has("debug"));
    const forced = new URLSearchParams(window.location.search).has("quality");
    useWorld.getState().setQuality(detectInitialQuality(), forced);
    useAudio.getState().setAvailability(musicAvailable ? "available" : "missing");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const w = useWorld.getState();
      w.setReducedMotion(w.reducedMotionOverride ?? mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [musicAvailable]);

  if (webgl === null) return <div className="fixed inset-0 bg-[var(--bg)]" />;
  if (!webgl) return <WebGLFallback />;

  return (
    <WorldBoundary fallback={<WebGLFallback />}>
    <div className="fixed inset-0 overflow-hidden bg-[var(--bg)]">
      <Canvas
        frameloop={letterOpen ? "demand" : "always"}
        className="!touch-none"
        shadows={settings.shadows ? "percentage" : false}
        dpr={settings.dpr}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false, stencil: false }}
        camera={{ fov: shots.arrivalStart.fov, near: 0.1, far: 900, position: shots.arrivalStart.position }}
        onCreated={({ gl }) => {
          gl.toneMapping = NeutralToneMapping;
          gl.outputColorSpace = SRGBColorSpace;
          // Phones can drop the GPU context under memory pressure: show the 2D page rather than a frozen frame.
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            setWebgl(false);
          });
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
    </WorldBoundary>
  );
}
