"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, MeshStandardMaterial, type PointLight } from "three";
import { mulberry32 } from "@/lib/three/noise";
import { islandHeight, pondWaterLevel } from "@/lib/three/terrain";
import { woodTextures } from "@/lib/three/textures";
import { dock } from "../locations";
import { createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";

/** A small wooden dock reaching over the pond, with a folded blanket and a little lantern. */
export function PondDock({ shadows }: { shadows: boolean }) {
  const [sx, sz] = dock.shore;
  const [dx, dz] = dock.dir;
  // Dock runs from 0.55 inland to the tip over the water.
  const length = 0.95 + 0.55;
  const cx = sx - dx * (0.95 - 0.55) * 0.5;
  const cz = sz - dz * (0.95 - 0.55) * 0.5;
  const yaw = Math.atan2(-dx, -dz); // local +z points out over the water
  const deck = dock.deckY;
  const lantern = useRef<PointLight>(null);

  const mats = useMemo(() => {
    const t = woodTextures({ planks: 5, base: [150, 112, 80], seed: 14 });
    t.map.repeat.set(1, 1);
    return {
      plank: new MeshStandardMaterial({ map: t.map, bumpMap: t.bumpMap, bumpScale: 1, roughness: 0.9 }),
      post: new MeshStandardMaterial({ color: "#5B412E", roughness: 0.95 }),
      blanket: new MeshStandardMaterial({ color: "#B7A9CC", roughness: 0.95 }),
      blanket2: new MeshStandardMaterial({ color: "#EBDDC3", roughness: 0.95 }),
      lantern: new MeshStandardMaterial({ color: "#FFE2A8", emissive: new Color("#FFC36E"), emissiveIntensity: 1 }),
      tex: [t.map, t.bumpMap],
    };
  }, []);
  const glowMat = useMemo(() => createGlowMaterial("#FFC170", 0.5), []);

  const planks = useMemo(() => {
    const rand = mulberry32(3);
    const n = 11;
    return Array.from({ length: n }, (_, i) => ({
      z: -length / 2 + (i + 0.5) * (length / n),
      w: 0.78 + (rand() - 0.5) * 0.05,
      rot: (rand() - 0.5) * 0.03,
      dy: (rand() - 0.5) * 0.012,
    }));
  }, [length]);

  useFrame(() => {
    const g = shared.uWindowGlow.value;
    const t = shared.uTime.value;
    const flicker = 0.9 + 0.1 * Math.sin(t * 6.1) * Math.sin(t * 2.3 + 1.1);
    mats.lantern.emissiveIntensity = (0.5 + g * 2) * flicker;
    glowMat.uniforms.uOpacity.value = (0.1 + g * 0.8) * flicker;
    if (lantern.current) lantern.current.intensity = g * 1.6 * flicker;
  });

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => (Array.isArray(m) ? m.forEach((t) => t.dispose()) : m.dispose()));
      glowMat.dispose();
    },
    [mats, glowMat],
  );

  const groundAtStart = islandHeight(sx + dx * 0.55, sz + dz * 0.55);

  return (
    <group position={[cx, deck, cz]} rotation={[0, yaw, 0]}>
      {planks.map((p, i) => (
        <mesh key={i} position={[0, p.dy, p.z]} rotation={[0, p.rot, 0]} material={mats.plank} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[p.w, 0.05, length / planks.length - 0.012]} />
        </mesh>
      ))}
      {/* Stringers under the planks */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, -0.06, 0]} material={mats.post}>
          <boxGeometry args={[0.06, 0.07, length]} />
        </mesh>
      ))}
      {/* Posts down into the water / ground */}
      {[-0.34, 0.34].flatMap((x) =>
        [0.62, -0.1].map((z) => {
          const bottom = z > 0 ? pondWaterLevel - 0.45 - deck : groundAtStart - 0.2 - deck;
          const h = 0.12 - bottom;
          return (
            <mesh key={`${x}${z}`} position={[x, 0.12 - h / 2, z]} material={mats.post} castShadow={shadows}>
              <cylinderGeometry args={[0.045, 0.05, h, 8]} />
            </mesh>
          );
        }),
      )}
      {/* Folded blanket and a cushion — a place to sit */}
      <group position={[0.12, 0.05, 0.25]} rotation={[0, 0.25, 0]}>
        <mesh material={mats.blanket} castShadow={shadows} receiveShadow={shadows}>
          <boxGeometry args={[0.46, 0.05, 0.36]} />
        </mesh>
        <mesh position={[0, 0.045, 0]} material={mats.blanket2} castShadow={shadows}>
          <boxGeometry args={[0.44, 0.04, 0.1]} />
        </mesh>
      </group>
      {/* Little lantern on the corner */}
      <group position={[-0.32, 0.08, 0.58]}>
        <mesh material={mats.post}>
          <boxGeometry args={[0.1, 0.02, 0.1]} />
        </mesh>
        <mesh position={[0, 0.07, 0]} material={mats.lantern}>
          <cylinderGeometry args={[0.035, 0.04, 0.11, 8]} />
        </mesh>
        <mesh position={[0, 0.14, 0]} material={mats.post}>
          <coneGeometry args={[0.055, 0.05, 8]} />
        </mesh>
        <Billboard position={[0, 0.07, 0]}>
          <mesh material={glowMat} renderOrder={6}>
            <planeGeometry args={[0.7, 0.7]} />
          </mesh>
        </Billboard>
        <pointLight ref={lantern} position={[0, 0.1, 0]} color="#FFB869" distance={2.5} decay={2} intensity={0} />
      </group>
    </group>
  );
}
