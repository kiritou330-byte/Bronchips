"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  Color,
  CylinderGeometry,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  type PointLight,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { layout } from "@/config/world.config";
import { mulberry32, noise3 } from "@/lib/three/noise";
import { islandHeight, islandNormal } from "@/lib/three/terrain";
import { createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";

const up = new Vector3(0, 1, 0);

function lumpy(detail: number, amp: number, squash = 1) {
  const g = new IcosahedronGeometry(1, detail);
  const p = g.attributes.position as BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const n = 1 + noise3(x * 1.6, y * 1.6, z * 1.6) * amp;
    p.setXYZ(i, x * n, y * n * squash, z * n);
  }
  g.computeVertexNormals();
  return g;
}

interface Placement {
  x: number;
  z: number;
  s: [number, number, number];
  yaw: number;
  sink?: number;
  color?: Color;
}

function instanced(geo: THREE_Geo, mat: MeshStandardMaterial, list: Placement[], alignToGround = true) {
  const mesh = new InstancedMesh(geo, mat, list.length);
  const m = new Matrix4();
  const q = new Quaternion();
  const qy = new Quaternion();
  const n = new Vector3();
  const colors = new Float32Array(list.length * 3);
  list.forEach((pl, i) => {
    qy.setFromAxisAngle(up, pl.yaw);
    if (alignToGround) {
      n.set(...islandNormal(pl.x, pl.z));
      q.setFromUnitVectors(up, n).multiply(qy);
    } else q.copy(qy);
    m.compose(new Vector3(pl.x, islandHeight(pl.x, pl.z) - (pl.sink ?? 0), pl.z), q, new Vector3(...pl.s));
    mesh.setMatrixAt(i, m);
    const c = pl.color ?? new Color(1, 1, 1);
    colors.set([c.r, c.g, c.b], i * 3);
  });
  mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
  return mesh;
}
type THREE_Geo = ConstructorParameters<typeof InstancedMesh>[0];

function LanternPost({ x, z, shadows }: { x: number; z: number; shadows: boolean }) {
  const y = islandHeight(x, z);
  const light = useRef<PointLight>(null);
  const glass = useMemo(
    () => new MeshStandardMaterial({ color: "#FFE2A8", emissive: new Color("#FFC36E"), emissiveIntensity: 1 }),
    [],
  );
  const glow = useMemo(() => createGlowMaterial("#FFC170", 0.4), []);
  useFrame(() => {
    const g = shared.uWindowGlow.value;
    const t = shared.uTime.value;
    const f = 0.9 + 0.1 * Math.sin(t * 5.3 + x) * Math.sin(t * 2.1 + z);
    glass.emissiveIntensity = (0.3 + g * 2.2) * f;
    glow.uniforms.uOpacity.value = (0.05 + g * 0.9) * f;
    if (light.current) light.current.intensity = g * 1.8 * f;
  });
  useEffect(
    () => () => {
      glass.dispose();
      glow.dispose();
    },
    [glass, glow],
  );
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.45, 0]} castShadow={shadows}>
        <cylinderGeometry args={[0.03, 0.04, 0.9, 8]} />
        <meshStandardMaterial color="#4E3A2C" roughness={0.9} />
      </mesh>
      <mesh position={[0.09, 0.86, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.18, 6]} />
        <meshStandardMaterial color="#4E3A2C" />
      </mesh>
      <group position={[0.17, 0.76, 0]}>
        <mesh material={glass}>
          <cylinderGeometry args={[0.045, 0.05, 0.12, 8]} />
        </mesh>
        <mesh position={[0, 0.08, 0]}>
          <coneGeometry args={[0.07, 0.06, 8]} />
          <meshStandardMaterial color="#3E2F25" />
        </mesh>
        <Billboard>
          <mesh material={glow} renderOrder={6}>
            <planeGeometry args={[0.9, 0.9]} />
          </mesh>
        </Billboard>
        <pointLight ref={light} color="#FFB869" distance={3} decay={2} intensity={0} />
      </group>
    </group>
  );
}

export function Props({ shadows }: { shadows: boolean }) {
  const meshes = useMemo(() => {
    const rand = mulberry32(2024);
    const stoneMat = new MeshStandardMaterial({ roughness: 0.92 });
    const capMat = new MeshStandardMaterial({ roughness: 0.6 });
    const stemMat = new MeshStandardMaterial({ color: "#EDE3CF", roughness: 0.8 });
    const woodMat = new MeshStandardMaterial({ color: "#7A5A3E", roughness: 0.9 });

    // Stepping stones along the path.
    const steps: Placement[] = [];
    const path = layout.path;
    for (let i = 0; i < path.length - 1; i++) {
      const [ax, az] = path[i];
      const [bx, bz] = path[i + 1];
      const segs = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 0.55));
      for (let k = 0; k < segs; k++) {
        const t = (k + 0.5) / segs;
        steps.push({
          x: ax + (bx - ax) * t + (rand() - 0.5) * 0.12,
          z: az + (bz - az) * t + (rand() - 0.5) * 0.12,
          s: [0.2 + rand() * 0.06, 0.05, 0.17 + rand() * 0.05],
          yaw: rand() * 3,
          sink: 0.02,
          color: new Color("#B4A898").multiplyScalar(0.85 + rand() * 0.25),
        });
      }
    }
    const stepGeo = lumpy(1, 0.15);

    // Scattered rocks.
    const rockSpots: [number, number, number][] = [
      [-6.9, -0.2, 0.42], [6.2, 0.2, 0.32], [-1.6, 6.4, 0.28], [2.8, 6.6, 0.36], [7.2, -4.5, 0.3], [-7.6, -4.2, 0.4],
    ];
    const rocks = rockSpots.map(([x, z, s]) => ({
      x,
      z,
      s: [s * 1.3, s * 0.8, s] as [number, number, number],
      yaw: rand() * 6,
      sink: s * 0.25,
      color: new Color("#A39686").multiplyScalar(0.8 + rand() * 0.3),
    }));
    const rockGeo = lumpy(2, 0.22, 0.85);

    // Mushrooms at the feet of trees.
    const caps: Placement[] = [];
    const stems: Placement[] = [];
    const capColors = ["#C9785F", "#E3C29A", "#B9624C"];
    [layout.trees[0], layout.trees[1], layout.trees[3], layout.trees[4]].forEach((tr, ti) => {
      const n = 3 + Math.floor(rand() * 3);
      for (let k = 0; k < n; k++) {
        const a = rand() * Math.PI * 2;
        const r = 0.45 + rand() * 0.35;
        const x = tr.position[0] + Math.cos(a) * r;
        const z = tr.position[1] + Math.sin(a) * r;
        const h = 0.08 + rand() * 0.08;
        stems.push({ x, z, s: [0.022, h, 0.022], yaw: 0 });
        caps.push({
          x,
          z,
          s: [0.06 + h * 0.4, 0.04, 0.06 + h * 0.4],
          yaw: rand() * 6,
          sink: -h,
          color: new Color(capColors[(ti + k) % capColors.length]),
        });
      }
    });
    const stemGeo = new CylinderGeometry(1, 1.2, 1, 6);
    stemGeo.translate(0, 0.5, 0);
    const capGeo = new SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);

    // A short picket fence around the cottage's front garden.
    const [cx, cz] = layout.cottage.position;
    const fence: Placement[] = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const x = cx + 1.0 + t * 1.2;
      const z = cz + 2.15 - t * 0.55;
      fence.push({ x, z, s: [0.05, 0.38 + (i % 2) * 0.03, 0.05], yaw: 0.42, sink: 0.02, color: new Color("#EFE4CC") });
    }
    const fenceGeo = new CylinderGeometry(1, 1, 1, 4);
    fenceGeo.translate(0, 0.5, 0);

    const out = {
      steps: instanced(stepGeo, stoneMat, steps),
      rocks: instanced(rockGeo, stoneMat, rocks),
      caps: instanced(capGeo, capMat, caps, false),
      stems: instanced(stemGeo, stemMat, stems, false),
      fence: instanced(fenceGeo, woodMat, fence, false),
      rail: { from: fence[0], to: fence[fence.length - 1] },
      disposables: [stepGeo, rockGeo, stemGeo, capGeo, fenceGeo, stoneMat, capMat, stemMat, woodMat],
    };
    return out;
  }, []);

  useEffect(() => {
    [meshes.rocks, meshes.fence, meshes.steps].forEach((m) => {
      m.castShadow = shadows;
      m.receiveShadow = shadows;
    });
  }, [meshes, shadows]);

  useEffect(
    () => () => {
      [meshes.steps, meshes.rocks, meshes.caps, meshes.stems, meshes.fence].forEach((m) => m.dispose());
      meshes.disposables.forEach((d) => d.dispose());
    },
    [meshes],
  );

  const { from, to } = meshes.rail;
  const fy = islandHeight(from.x, from.z);
  const ty = islandHeight(to.x, to.z);
  const len = Math.hypot(to.x - from.x, to.z - from.z);
  const yaw = Math.atan2(-(to.z - from.z), to.x - from.x);
  const lanterns = layout.path;

  return (
    <group>
      <primitive object={meshes.steps} />
      <primitive object={meshes.rocks} />
      <primitive object={meshes.stems} />
      <primitive object={meshes.caps} />
      <primitive object={meshes.fence} />
      {[0.14, 0.28].map((h) => (
        <mesh
          key={h}
          position={[(from.x + to.x) / 2, (fy + ty) / 2 + h, (from.z + to.z) / 2]}
          rotation={[0, yaw, Math.atan2(ty - fy, len)]}
          castShadow={shadows}
        >
          <boxGeometry args={[len, 0.03, 0.025]} />
          <meshStandardMaterial color="#EFE4CC" roughness={0.8} />
        </mesh>
      ))}
      <LanternPost x={lanterns[1][0] + 0.35} z={lanterns[1][1] - 0.3} shadows={shadows} />
      <LanternPost x={lanterns[3][0] - 0.25} z={lanterns[3][1] - 0.45} shadows={shadows} />
    </group>
  );
}
