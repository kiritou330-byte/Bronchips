"use client";

import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  type Group,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { useInteractive } from "@/hooks/useInteractive";
import { mulberry32, noise2 } from "@/lib/three/noise";
import { islandHeight } from "@/lib/three/terrain";
import { useWorld } from "@/state/world";
import { glanceAt } from "../camera/rig";
import { shared } from "../materials/shared";

/** Live butterfly positions (read by the QA tooling). */
export const butterflyPositions: Vector3[] = [];

/** Hidden spot the butterflies lead to (a rare flower behind the cottage). */
export const RARE_FLOWER: [number, number] = [-4.15, -2.95];

function wingTexture(base: string, edge: string) {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  // Forewing (upper) and hindwing (lower), hinge on the left edge.
  const shape = (cx: number, cy: number, rx: number, ry: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.restore();
  };
  const g = ctx.createRadialGradient(10, s / 2, 4, 10, s / 2, s * 0.95);
  g.addColorStop(0, edge);
  g.addColorStop(0.25, base);
  g.addColorStop(0.8, base);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  shape(s * 0.42, s * 0.36, s * 0.4, s * 0.25, -0.35);
  ctx.fill();
  shape(s * 0.34, s * 0.72, s * 0.28, s * 0.2, 0.45);
  ctx.fill();
  // Dark rim + little pale dots, like real wing patterns.
  ctx.strokeStyle = edge;
  ctx.lineWidth = 5;
  shape(s * 0.42, s * 0.36, s * 0.4, s * 0.25, -0.35);
  ctx.stroke();
  shape(s * 0.34, s * 0.72, s * 0.28, s * 0.2, 0.45);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,250,240,0.85)";
  [
    [0.72, 0.3, 4],
    [0.62, 0.2, 3],
    [0.5, 0.78, 3],
  ].forEach(([x, y, r]) => {
    ctx.beginPath();
    ctx.arc(x * s, y * s, r, 0, Math.PI * 2);
    ctx.fill();
  });
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

interface Def {
  home: [number, number];
  radius: number;
  base: string;
  edge: string;
  seed: number;
}

const defs: Def[] = [
  { home: [-1.2, 2.4], radius: 1.6, base: "#C9B8E8", edge: "#5B4A7A", seed: 1 },
  { home: [2.2, -0.4], radius: 1.4, base: "#F6D58B", edge: "#7A5A2C", seed: 2 },
  { home: [-3.6, 1.0], radius: 1.2, base: "#F2B59C", edge: "#7A4434", seed: 3 },
  { home: [4.6, 3.6], radius: 1.3, base: "#FFF4E0", edge: "#6F6A5E", seed: 4 },
];

function Butterfly({ def, index }: { def: Def; index: number }) {
  const root = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const tex = useMemo(() => wingTexture(def.base, def.edge), [def]);
  const wingMat = useMemo(
    () =>
      new MeshStandardMaterial({
        map: tex,
        alphaTest: 0.5,
        side: DoubleSide,
        roughness: 0.6,
        emissive: new Color(def.base),
        emissiveIntensity: 0.12,
      }),
    [tex, def.base],
  );
  const wingGeo = useMemo(() => {
    const g = new PlaneGeometry(0.2, 0.2);
    g.translate(0.1, 0, 0); // hinge at x = 0, wing spreads to +x
    g.rotateX(Math.PI / 2); // lie flat; forewing (texture top) points forward (+z)
    return g;
  }, []);
  const rand = useMemo(() => mulberry32(def.seed * 97), [def.seed]);
  const speeds = useMemo(() => ({ a: 0.35 + rand() * 0.2, b: 0.5 + rand() * 0.3, c: 0.27 + rand() * 0.2, phase: rand() * 10 }), [rand]);

  // Travel state: when tapped, the butterfly follows a curve to the hidden flower.
  const travel = useRef<{ curve: CatmullRomCurve3 | null; t: number; resting: boolean }>({ curve: null, t: 0, resting: false });
  const pos = useMemo(() => new Vector3(), []);
  const prev = useMemo(() => new Vector3(), []);

  const homeAt = useCallback(
    (t: number, out: Vector3) => {
      const [hx, hz] = def.home;
      const x = hx + Math.sin(t * speeds.a + speeds.phase) * def.radius + noise2(t * 0.3, def.seed) * 0.4;
      const z = hz + Math.cos(t * speeds.c + speeds.phase * 1.3) * def.radius * 0.8;
      const ground = islandHeight(x, z);
      const y = ground + 0.75 + Math.sin(t * speeds.b + speeds.phase) * 0.28 + Math.sin(t * 3.1 + index) * 0.04;
      return out.set(x, y, z);
    },
    [def, speeds, index],
  );

  const onTap = useCallback(() => {
    const tr = travel.current;
    if (tr.curve) return;
    const [rx, rz] = RARE_FLOWER;
    const ry = islandHeight(rx, rz);
    const start = pos.clone();
    const end = new Vector3(rx + 0.08 * (index - 1.5), ry + 1.05 + index * 0.04, rz + 0.06 * index);
    const mid = start.clone().lerp(end, 0.5);
    mid.y = Math.max(start.y, end.y) + 1.4;
    tr.curve = new CatmullRomCurve3([start, start.clone().add(new Vector3(0, 0.5, 0)), mid, end]);
    tr.t = 0;
    tr.resting = false;
    gsap.to(tr, {
      t: 1,
      duration: 5.5,
      ease: "sine.inOut",
      onComplete: () => {
        tr.resting = true;
        useWorld.getState().touch("rare-revealed");
      },
    });
    glanceAt(end.x, end.y - 0.6, end.z, 3);
    useWorld.getState().showMessage("Follow it…");
  }, [index, pos]);

  const { hovered, bind } = useInteractive(onTap);

  useFrame((_, dt) => {
    const t = shared.uTime.value;
    const tr = travel.current;
    prev.copy(pos);
    if (tr.curve && !tr.resting) tr.curve.getPoint(tr.t, pos);
    else if (tr.curve && tr.resting) {
      const end = tr.curve.points[tr.curve.points.length - 1];
      pos.set(end.x + Math.sin(t * 0.8 + index) * 0.25, end.y + Math.sin(t * 1.1 + index) * 0.12, end.z + Math.cos(t * 0.7 + index) * 0.25);
    } else homeAt(t, pos);

    butterflyPositions[index] = pos;
    if (!root.current) return;
    root.current.position.copy(pos);
    // Face the direction of travel (smoothly).
    const dx = pos.x - prev.x,
      dz = pos.z - prev.z;
    if (dx * dx + dz * dz > 1e-7) {
      const yaw = Math.atan2(dx, dz);
      let d = yaw - root.current.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      root.current.rotation.y += d * Math.min(1, dt * 6);
    }
    // Flap: fast bursts, occasional glides — never metronomic.
    const glide = noise2(t * 0.6, def.seed * 3) > 0.35 ? 0.35 : 1;
    const flap = Math.sin(t * (13 + index) * glide + speeds.phase);
    const open = 0.15 + (0.5 + 0.5 * flap) * 1.15 * glide + (hovered ? 0.2 : 0);
    if (left.current) left.current.rotation.z = open;
    if (right.current) right.current.rotation.z = -open;
    root.current.position.y += flap * 0.015;
  });

  useEffect(
    () => () => {
      tex.dispose();
      wingMat.dispose();
      wingGeo.dispose();
    },
    [tex, wingMat, wingGeo],
  );

  return (
    <group ref={root} scale={1.35}>
      <group {...bind}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.012, 0.09, 4, 6]} />
          <meshStandardMaterial color="#3A2E2A" roughness={0.8} />
        </mesh>
        <group ref={left} rotation={[0, 0, 0]}>
          <mesh geometry={wingGeo} material={wingMat} />
        </group>
        <group ref={right}>
          <mesh geometry={wingGeo} material={wingMat} scale={[-1, 1, 1]} />
        </group>
        {/* Generous invisible hit area for fingers. */}
        <mesh visible={false}>
          <sphereGeometry args={[0.32, 8, 6]} />
          <meshBasicMaterial />
        </mesh>
      </group>
    </group>
  );
}

export function Butterflies() {
  return (
    <>
      {defs.map((d, i) => (
        <Butterfly key={d.seed} def={d} index={i} />
      ))}
    </>
  );
}
