"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  IcosahedronGeometry,
  MeshStandardMaterial,
} from "three";
import { layout } from "@/config/world.config";
import { clamp, fbm3, lerp, mulberry32, noise2, noise3, smoothstep } from "@/lib/three/noise";
import { groundColor, islandHeight, islandRadiusAt, srgbToLinear } from "@/lib/three/terrain";

const RINGS = 56;
const SEGMENTS = 144;

/** Top surface: polar grid that follows islandHeight and rolls over the rim. */
function buildTop() {
  const verts: number[] = [];
  const colors: number[] = [];
  const c: [number, number, number] = [0, 0, 0];
  // ring 0 = centre point; rings 1..RINGS on the surface; +2 extra rings that fold under the lip.
  const ringCount = RINGS + 3;
  for (let i = 0; i < ringCount; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const a = (j / SEGMENTS) * Math.PI * 2;
      const rimR = islandRadiusAt(a);
      let x: number, z: number, y: number;
      if (i <= RINGS) {
        const t = i / RINGS;
        // Slightly denser near the rim where curvature is highest.
        const rr = rimR * 1.02 * (1 - Math.pow(1 - t, 1.35));
        x = Math.cos(a) * rr;
        z = Math.sin(a) * rr;
        y = islandHeight(x, z);
        groundColor(x, z, c);
      } else {
        // Fold under: rounded lip of soil.
        const k = i - RINGS; // 1, 2
        const rr = rimR * (1.02 + (k === 1 ? 0.012 : -0.01));
        x = Math.cos(a) * rr;
        z = Math.sin(a) * rr;
        const edgeY = islandHeight(Math.cos(a) * rimR * 1.02, Math.sin(a) * rimR * 1.02);
        y = edgeY - (k === 1 ? 0.18 : 0.42);
        c[0] = 0.3;
        c[1] = 0.21;
        c[2] = 0.14;
      }
      // Grassy lip darkens towards the edge (fake occlusion), soil shows under it.
      const rn = Math.hypot(x, z) / rimR;
      const edgeDark = smoothstep(0.97, 1.035, rn);
      const n = noise2(x * 2.3, z * 2.3) * 0.04;
      verts.push(x, y, z);
      colors.push(
        srgbToLinear(clamp(lerp(c[0], 0.3, edgeDark * 0.6) + n, 0, 1)),
        srgbToLinear(clamp(lerp(c[1], 0.26, edgeDark * 0.6) + n, 0, 1)),
        srgbToLinear(clamp(lerp(c[2], 0.16, edgeDark * 0.6) + n * 0.5, 0, 1)),
      );
    }
  }
  const index: number[] = [];
  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = 0; j < SEGMENTS; j++) {
      const a = i * SEGMENTS + j;
      const b = i * SEGMENTS + ((j + 1) % SEGMENTS);
      const cc = (i + 1) * SEGMENTS + j;
      const d = (i + 1) * SEGMENTS + ((j + 1) % SEGMENTS);
      index.push(a, b, cc, b, d, cc);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(verts), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Underside: inverted rocky cone with vertical ridges and warm sediment strata. */
function buildUnderside() {
  const rings = 26;
  const segs = 84;
  const depth = layout.islandDepth;
  const pos: number[] = [];
  const col: number[] = [];
  const grid: [number, number, number][][] = [];
  for (let i = 0; i <= rings; i++) {
    const s = i / rings;
    const row: [number, number, number][] = [];
    for (let j = 0; j < segs; j++) {
      // Jitter the grid so facets read as chiselled rock, not a quilt.
      const jitter = i > 0 && i < rings ? (noise2(i * 7.3, j * 3.1) * 0.45) / segs : 0;
      const a = ((j + 0.5 * (i % 2)) / segs) * Math.PI * 2 + jitter * Math.PI * 2;
      const rimR = islandRadiusAt(a);
      const edgeY = islandHeight(Math.cos(a) * rimR * 1.0, Math.sin(a) * rimR * 1.0) - 0.42;
      // Profile: bulges a little just under the rim, then tapers to a craggy point.
      const profile = (1 - Math.pow(s, 1.55)) * (1 + 0.05 * Math.sin(s * Math.PI));
      let r = rimR * 0.995 * profile;
      let y = lerp(edgeY, -depth, Math.pow(s, 0.92)) + (i > 0 && i < rings ? noise2(j * 1.9, i * 2.7) * 0.12 : 0);
      // Ridged, vertically stretched noise: rock columns and ledges.
      const nx = Math.cos(a) * 3.2,
        nz = Math.sin(a) * 3.2;
      const ridge = 1 - Math.abs(noise3(nx, y * 0.22, nz));
      const ledge = Math.sin(y * 2.6 + noise2(nx, nz) * 2.0) * 0.5 + 0.5;
      const amp = 0.25 + s * 0.9;
      r += (ridge - 0.5) * amp * 1.2 + (ledge - 0.5) * 0.25 * (1 - s);
      if (i === 0) r = rimR * 0.995; // seal to the lip
      if (i === rings) r = 0;
      y += fbm3(nx * 0.6, y * 0.3, nz * 0.6, 3) * 0.6 * s;
      row.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    grid.push(row);
  }
  const rand = mulberry32(5);
  const strata = [new Color("#8E7A63"), new Color("#A08D74"), new Color("#7B6A58"), new Color("#94816A")];
  const soil = new Color("#5A4330");
  const deep = new Color("#4A4048");
  const moss = new Color("#5E7140");
  const tmp = new Color();
  const pushTri = (p: [number, number, number][]) => {
    // Flat-shaded faces: colour per face for crisp, chiselled rock.
    const cy = (p[0][1] + p[1][1] + p[2][1]) / 3;
    const cx = (p[0][0] + p[1][0] + p[2][0]) / 3;
    const cz = (p[0][2] + p[1][2] + p[2][2]) / 3;
    // Smooth sediment bands instead of random per-face colours.
    const bandT = (cy + noise2(cx * 0.3, cz * 0.3) * 0.8) * 0.9;
    const bi = Math.floor(bandT);
    const bf = bandT - bi;
    tmp.copy(strata[((bi % 4) + 4) % 4]).lerp(strata[(((bi + 1) % 4) + 4) % 4], smoothstep(0.6, 1.0, bf));
    const sDepth = clamp(-cy / layout.islandDepth, 0, 1);
    tmp.lerp(deep, Math.pow(sDepth, 1.3) * 0.75);
    if (cy > -0.9) tmp.lerp(soil, smoothstep(-0.9, -0.3, cy));
    if (cy > -2.4 && noise3(cx * 0.8, cy * 0.8, cz * 0.8) > 0.25) tmp.lerp(moss, 0.55);
    const v = 0.96 + rand() * 0.07;
    for (const q of p) {
      pos.push(q[0], q[1], q[2]);
      col.push(tmp.r * v, tmp.g * v, tmp.b * v);
    }
  };
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < segs; j++) {
      const a = grid[i][j],
        b = grid[i][(j + 1) % segs],
        c = grid[i + 1][j],
        d = grid[i + 1][(j + 1) % segs];
      pushTri([a, b, c]);
      pushTri([b, d, c]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.computeVertexNormals();
  return g;
}

/** Small rock shards that float around the underside and bob slowly. */
function buildShard(seed: number) {
  const g = new IcosahedronGeometry(1, 1);
  const p = g.attributes.position as BufferAttribute;
  const rand = mulberry32(seed);
  const sx = 0.8 + rand() * 0.5,
    sy = 1.1 + rand() * 0.8;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const n = 1 + noise3(x * 1.5 + seed, y * 1.5, z * 1.5) * 0.35;
    // Flat top, pointy bottom.
    y = y > 0 ? y * 0.35 : y * sy;
    x *= sx * n;
    z *= n;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

const shardDefs = [
  { pos: [-10.6, -2.6, 3.4], s: 0.55, seed: 1, speed: 0.5 },
  { pos: [9.8, -3.8, -4.2], s: 0.75, seed: 2, speed: 0.38 },
  { pos: [4.6, -5.4, 9.4], s: 0.42, seed: 3, speed: 0.62 },
  { pos: [-6.8, -6.0, -8.6], s: 0.6, seed: 4, speed: 0.44 },
  { pos: [11.4, -1.4, 4.2], s: 0.32, seed: 6, speed: 0.7 },
] as const;

export function Island({ shadows }: { shadows: boolean }) {
  const top = useMemo(buildTop, []);
  const under = useMemo(buildUnderside, []);
  const shards = useMemo(() => shardDefs.map((d) => buildShard(d.seed)), []);
  const topMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }), []);
  const rockMat = useMemo(
    () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true }),
    [],
  );
  const shardMat = useMemo(
    () =>
      new MeshStandardMaterial({ color: "#8F7C69", roughness: 0.9, flatShading: true }),
    [],
  );
  const shardRefs = useRef<(Group | null)[]>([]);

  useEffect(
    () => () => {
      top.dispose();
      under.dispose();
      shards.forEach((s) => s.dispose());
      topMat.dispose();
      rockMat.dispose();
      shardMat.dispose();
    },
    [top, under, shards, topMat, rockMat, shardMat],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    shardRefs.current.forEach((g, i) => {
      if (!g) return;
      const d = shardDefs[i];
      g.position.y = d.pos[1] + Math.sin(t * d.speed + i * 1.7) * 0.35;
      g.rotation.y = t * 0.05 * (i % 2 ? 1 : -1) + i;
    });
  });

  return (
    <group>
      <mesh geometry={top} material={topMat} receiveShadow={shadows} />
      <mesh geometry={under} material={rockMat} castShadow={false} receiveShadow={false} />
      {shardDefs.map((d, i) => (
        <group
          key={d.seed}
          ref={(el) => {
            shardRefs.current[i] = el;
          }}
          position={[d.pos[0], d.pos[1], d.pos[2]]}
          scale={d.s}
        >
          <mesh geometry={shards[i]} material={shardMat} />
          {/* A tuft of grass on each shard keeps them part of the same world. */}
          <mesh position={[0, 0.36, 0]} scale={[0.95, 0.12, 0.95]}>
            <sphereGeometry args={[0.85, 12, 8]} />
            <meshStandardMaterial color="#6E8A45" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
