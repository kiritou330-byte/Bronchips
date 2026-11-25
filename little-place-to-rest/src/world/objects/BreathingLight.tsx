"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  Color,
  DoubleSide,
  type Group,
  type Mesh,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
} from "three";
import { breathAt, useBreathing } from "@/state/breathing";
import { useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";
import { pondWaterLevel } from "@/lib/three/terrain";
import { breathPoint } from "../locations";
import { createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";
import { pondRipples } from "./Pond";

const PETALS = 9;

/** Soft additive petal: bright centre line fading to the edges. */
function petalMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color("#FFE2B0") }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying vec2 vUv;
      void main() {
        float v = vUv.y;
        float w = 0.5 * pow(sin(3.14159 * pow(v, 0.8)), 0.8);
        float d = abs(vUv.x - 0.5) / max(w, 0.001);
        float a = smoothstep(1.0, 0.2, d) * smoothstep(0.0, 0.15, v) * (0.55 + 0.45 * (1.0 - v));
        gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/**
 * Scene 03 — a lotus of light above the pond that opens as you breathe in and closes
 * as you breathe out. Barely there until the visitor sits by the water.
 */
export function BreathingLight() {
  const group = useRef<Group>(null);
  const petals = useRef<(Mesh | null)[]>([]);
  const ring = useRef<Mesh>(null);
  const visible = useRef(0);
  const lastPhase = useRef<"in" | "out">("in");

  const petalGeo = useMemo(() => {
    const g = new PlaneGeometry(0.17, 0.34, 1, 6);
    g.translate(0, 0.17, 0);
    // Cup the petal slightly.
    const p = g.attributes.position as BufferAttribute;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.pow(p.getY(i) / 0.34, 2) * 0.06);
    return g;
  }, []);
  const petalMat = useMemo(petalMaterial, []);
  const coreMat = useMemo(() => createGlowMaterial("#FFE7BE", 0), []);
  const haloMat = useMemo(() => createGlowMaterial("#FFC98A", 0), []);
  const ringGeo = useMemo(() => new RingGeometry(0.42, 0.47, 64), []);
  const ringMat = useMemo(() => createGlowMaterial("#FFE2B0", 0), []);

  useFrame((_, dt) => {
    const phase = useNavigation.getState().phase;
    const b = useBreathing.getState();
    const reduced = useWorld.getState().reducedMotion;
    const target = phase === "pond" ? 1 : 0;
    visible.current += (target - visible.current) * Math.min(1, dt * 1.5);
    const vis = visible.current;
    if (group.current) group.current.visible = vis > 0.005;
    if (vis <= 0.005) return;

    const now = performance.now() / 1000;
    let amount: number;
    if (b.active) {
      const elapsed = now - b.startedAt;
      const s = breathAt(elapsed);
      amount = s.amount;
      if (s.phase !== lastPhase.current) {
        // A soft ring spreads over the water at the start of each out-breath.
        if (s.phase === "out") pondRipples.add(breathPoint[0], breathPoint[2]);
        lastPhase.current = s.phase;
      }
      if (b.duration !== null && elapsed >= b.duration) b.finish();
    } else {
      // Resting: a slow, small pulse that invites without asking.
      amount = 0.25 + 0.12 * Math.sin(shared.uTime.value * 0.6);
    }
    const night = shared.uNight.value;
    const strength = vis * (0.5 + night * 0.45) * (b.active ? 1 : 0.65);

    petals.current.forEach((p, i) => {
      if (!p) return;
      const open = reduced ? 0.6 : amount;
      p.rotation.x = -1.15 + open * 0.75 + Math.sin(i * 2.1) * 0.05;
      p.scale.setScalar(0.65 + open * 0.55);
    });
    petalMat.uniforms.uOpacity.value = strength * (0.55 + amount * 0.45);
    coreMat.uniforms.uOpacity.value = strength * (0.6 + amount * 0.6);
    haloMat.uniforms.uOpacity.value = strength * (0.18 + amount * 0.3);
    ringMat.uniforms.uOpacity.value = strength * (0.25 + amount * 0.35);
    if (ring.current) ring.current.scale.setScalar(0.7 + amount * 1.6);
    if (group.current) group.current.position.y = breathPoint[1] + Math.sin(shared.uTime.value * 0.5) * 0.03 + amount * 0.06;
  });

  useEffect(
    () => () => {
      [petalGeo, ringGeo].forEach((g) => g.dispose());
      [petalMat, coreMat, haloMat, ringMat].forEach((m) => m.dispose());
    },
    [petalGeo, ringGeo, petalMat, coreMat, haloMat, ringMat],
  );

  return (
    <>
      <group ref={group} position={breathPoint} visible={false}>
        {Array.from({ length: PETALS }, (_, i) => (
          <group key={i} rotation={[0, (i / PETALS) * Math.PI * 2, 0]}>
            <mesh
              ref={(el) => {
                petals.current[i] = el;
              }}
              geometry={petalGeo}
              material={petalMat}
              renderOrder={8}
            />
          </group>
        ))}
        <Billboard>
          <mesh material={coreMat} scale={0.34} renderOrder={9}>
            <planeGeometry args={[1, 1]} />
          </mesh>
          <mesh material={haloMat} scale={1.5} renderOrder={7}>
            <planeGeometry args={[1, 1]} />
          </mesh>
        </Billboard>
      </group>
      <mesh
        ref={ring}
        geometry={ringGeo}
        material={ringMat}
        position={[breathPoint[0], pondWaterLevel + 0.02, breathPoint[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={6}
      />
    </>
  );
}
