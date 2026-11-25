"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import { messages } from "@/config/messages.config";
import { useInteractive } from "@/hooks/useInteractive";
import { mulberry32 } from "@/lib/three/noise";
import { taperedTube } from "@/lib/three/geometry";
import { islandHeight } from "@/lib/three/terrain";
import { useWorld } from "@/state/world";
import { createBurstMaterial, createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";

const PETALS = 8;
const INNER = 5;
const CLOSED = -1.38;
const OPEN = -0.55;
const INNER_CLOSED = -1.5;
const INNER_OPEN = -1.02;

/** Cupped petal lying along +Z from the pivot, with a soft colour gradient. */
function petalGeometry(color: Color) {
  const g = new PlaneGeometry(1, 1, 5, 8);
  const pos = g.attributes.position as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const base = color.clone().multiplyScalar(0.72);
  const tip = color.clone().lerp(new Color("#FFF6EA"), 0.35);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i); // -0.5..0.5
    const v = pos.getY(i) + 0.5; // 0..1
    const width = 0.11 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.8) + 0.012;
    const x = u * 2 * width;
    const z = v * 0.26;
    const y = (x * x) * 6 + v * v * 0.035;
    pos.setXYZ(i, x, y, z);
    c.copy(base).lerp(tip, Math.pow(v, 0.8));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

function burstGeometry(seed: number) {
  const n = 26;
  const rand = mulberry32(seed);
  const dir = new Float32Array(n * 4);
  const v = new Vector3();
  for (let i = 0; i < n; i++) {
    v.set(rand() - 0.5, rand() * 0.8 + 0.1, rand() - 0.5).normalize();
    dir.set([v.x, v.y, v.z, rand()], i * 4);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute("aDir", new BufferAttribute(dir, 4));
  return g;
}

export function InteractiveFlower({
  id,
  position,
  color,
  seed,
  messageIndex,
}: {
  id: string;
  position: [number, number];
  color: string;
  seed: number;
  messageIndex: number;
}) {
  const dpr = useThree((s) => s.viewport.dpr);
  const bloomed = useWorld((s) => !!s.touched[id]);
  const reducedMotion = useWorld((s) => s.reducedMotion);
  const y = useMemo(() => islandHeight(position[0], position[1]), [position]);
  const col = useMemo(() => new Color(color), [color]);

  const petalGeo = useMemo(() => petalGeometry(col), [col]);
  const petalMat = useMemo(
    () =>
      new MeshStandardMaterial({
        vertexColors: true,
        side: DoubleSide,
        roughness: 0.55,
        emissive: col.clone().multiplyScalar(0.12),
      }),
    [col],
  );
  const stemGeo = useMemo(
    () =>
      taperedTube(
        [new Vector3(0, -0.05, 0), new Vector3(0.03, 0.28, 0.01), new Vector3(-0.01, 0.58, 0)],
        0.022,
        0.014,
        { radial: 6, lengthSegs: 8, color: new Color("#5D8A45"), dark: new Color("#3C5E2E"), seed },
      ),
    [seed],
  );
  const leafGeo = useMemo(() => {
    const g = petalGeometry(new Color("#5F8F45"));
    g.scale(1.1, 1, 1.25);
    return g;
  }, []);
  const glowMat = useMemo(() => createGlowMaterial("#FFD596", 0.9), []);
  const burstGeo = useMemo(() => burstGeometry(seed), [seed]);
  const burstMat = useMemo(() => createBurstMaterial("#FFE9B8"), []);

  const head = useRef<Group>(null);
  const root = useRef<Group>(null);
  const petals = useRef<(Mesh | null)[]>([]);
  const inner = useRef<(Mesh | null)[]>([]);
  const glow = useRef<Mesh>(null);
  const hoverAmt = useRef(0);
  const rand = useMemo(() => mulberry32(seed), [seed]);
  const phase = useMemo(() => rand() * 10, [rand]);

  // Restore the bloomed state without animation (e.g. after a remount).
  useEffect(() => {
    petals.current.forEach((p) => {
      if (p) p.rotation.x = bloomed ? OPEN : CLOSED;
    });
    inner.current.forEach((p) => {
      if (p) p.rotation.x = bloomed ? INNER_OPEN : INNER_CLOSED;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bloom = useCallback(() => {
    const dur = reducedMotion ? 0.6 : 1.6;
    petals.current.forEach((p, i) => {
      if (!p) return;
      gsap.to(p.rotation, {
        x: OPEN + Math.sin(i * 2.3) * 0.08,
        duration: dur,
        delay: reducedMotion ? 0 : i * 0.045,
        ease: reducedMotion ? "sine.out" : "back.out(1.7)",
      });
    });
    inner.current.forEach((p, i) => {
      if (!p) return;
      gsap.to(p.rotation, {
        x: INNER_OPEN + Math.sin(i * 1.7) * 0.06,
        duration: dur * 1.1,
        delay: reducedMotion ? 0 : 0.35 + i * 0.06,
        ease: reducedMotion ? "sine.out" : "back.out(1.4)",
      });
    });
    if (head.current && !reducedMotion) {
      gsap.fromTo(head.current.scale, { x: 0.86, y: 0.86, z: 0.86 }, { x: 1, y: 1, z: 1, duration: 1.4, ease: "elastic.out(1, 0.5)" });
    }
    burstMat.uniforms.uStart.value = shared.uTime.value + 0.15;
  }, [burstMat, reducedMotion]);

  const onTap = useCallback(() => {
    const st = useWorld.getState();
    if (!st.touched[id]) {
      st.touch(id);
      bloom();
    } else if (root.current && !reducedMotion) {
      // A small happy wiggle when touched again.
      gsap.fromTo(root.current.rotation, { z: 0.12 }, { z: 0, duration: 1.2, ease: "elastic.out(1.2, 0.35)" });
    }
    st.showMessage(messages.flowers[messageIndex % messages.flowers.length]);
  }, [bloom, id, messageIndex, reducedMotion]);

  const { hovered, active, bind } = useInteractive(onTap);

  useFrame((_, dt) => {
    const t = shared.uTime.value;
    hoverAmt.current += ((hovered ? 1 : 0) - hoverAmt.current) * Math.min(1, dt * 8);
    const h = hoverAmt.current;
    if (root.current) {
      const s = 1 + h * 0.1;
      root.current.scale.setScalar(s);
      // Gentle sway so it feels alive even before blooming.
      root.current.rotation.x = Math.sin(t * 1.3 + phase) * 0.05;
    }
    if (glow.current) {
      // Breathing halo = "you can touch me". Softer once bloomed.
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + phase);
      const base = bloomed ? 0.22 : 0.55 + pulse * 0.45;
      glowMat.uniforms.uOpacity.value = (base + h * 0.5) * (active || !bloomed ? 1 : 0.6) * (1 + shared.uAudio.value * 0.4);
      glow.current.scale.setScalar(0.55 + pulse * 0.12 + h * 0.15);
    }
    burstMat.uniforms.uPixelRatio.value = dpr;
  });

  useEffect(
    () => () => {
      [petalGeo, stemGeo, leafGeo, burstGeo].forEach((g) => g.dispose());
      [petalMat, glowMat, burstMat].forEach((m) => m.dispose());
    },
    [petalGeo, stemGeo, leafGeo, burstGeo, petalMat, glowMat, burstMat],
  );

  return (
    <group position={[position[0], y, position[1]]} scale={1.55}>
      <group ref={root} {...bind}>
        <mesh geometry={stemGeo} castShadow>
          <meshStandardMaterial vertexColors roughness={0.9} />
        </mesh>
        <mesh geometry={leafGeo} position={[0, 0.16, 0]} rotation={[-0.75, 0.6, 0]}>
          <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.8} />
        </mesh>
        <mesh geometry={leafGeo} position={[0, 0.24, 0]} rotation={[-0.85, -2.3, 0]}>
          <meshStandardMaterial vertexColors side={DoubleSide} roughness={0.8} />
        </mesh>
        <group ref={head} position={[-0.01, 0.58, 0]}>
          {Array.from({ length: PETALS }, (_, i) => (
            <group key={i} rotation={[0, (i / PETALS) * Math.PI * 2 + (i % 2) * 0.2, 0]}>
              <mesh
                ref={(el) => {
                  petals.current[i] = el;
                }}
                geometry={petalGeo}
                material={petalMat}
                rotation={[CLOSED, 0, 0]}
                position={[0, (i % 2) * 0.01, 0]}
                castShadow
              />
            </group>
          ))}
          {Array.from({ length: INNER }, (_, i) => (
            <group key={`in${i}`} rotation={[0, (i / INNER) * Math.PI * 2 + 0.3, 0]} scale={0.72}>
              <mesh
                ref={(el) => {
                  inner.current[i] = el;
                }}
                geometry={petalGeo}
                material={petalMat}
                rotation={[INNER_CLOSED, 0, 0]}
                position={[0, 0.015, 0]}
              />
            </group>
          ))}
          <mesh position={[0, 0.02, 0]} scale={[1, 0.7, 1]}>
            <sphereGeometry args={[0.045, 12, 8]} />
            <meshStandardMaterial color="#F2B84B" emissive="#E89A3C" emissiveIntensity={0.45} roughness={0.6} />
          </mesh>
          <points geometry={burstGeo} material={burstMat} frustumCulled={false} />
        </group>
        {/* Larger invisible hit area so the flower is easy to tap on a phone. */}
        <mesh position={[0, 0.45, 0]} visible={false}>
          <sphereGeometry args={[0.75, 8, 6]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <Billboard position={[0, 0.66, 0]}>
        <mesh ref={glow} material={glowMat} renderOrder={5}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      </Billboard>
    </group>
  );
}
