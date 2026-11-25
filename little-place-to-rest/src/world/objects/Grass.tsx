"use client";

import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from "three";
import { mulberry32, noise2, smoothstep } from "@/lib/three/noise";
import {
  distToCottage,
  distToPond,
  groundColor,
  insideFactor,
  islandNormal,
  pathDistance,
  sampleIsland,
  srgbToLinear,
} from "@/lib/three/terrain";
import { layout } from "@/config/world.config";
import { applyWind } from "../materials/wind";

/** A single tapered, slightly curved blade. y = 0..1, uv.y = height fraction. */
function bladeGeometry() {
  const segs = 4;
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const w = 0.045 * (1 - Math.pow(t, 1.4));
    const curve = t * t * 0.18;
    const shade = 0.58 + 0.72 * Math.pow(t, 0.9); // dark roots → light tips
    if (i < segs) {
      pos.push(-w, t, curve, w, t, curve);
      uv.push(0, t, 1, t);
      col.push(shade, shade, shade, shade, shade, shade);
    } else {
      pos.push(0, t, curve);
      uv.push(0.5, 1);
      col.push(shade * 1.06, shade * 1.08, shade);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < segs - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const last = (segs - 1) * 2;
  index.push(last, last + 1, last + 2);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

export function Grass({ count, shadows }: { count: number; shadows: boolean }) {
  const geometry = useMemo(bladeGeometry, []);
  const material = useMemo(() => {
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide });
    return applyWind(m, {
      bendPow: 1.6,
      bendAmp: 0.85,
      flutter: 0.12,
      translucency: 0.75,
      translucencyHeight: 0.4,
      upNormal: 0.72,
      audio: 0.25,
      touch: 3.4,
    });
  }, []);

  const mesh = useMemo(() => {
    const [cx, cz] = layout.cottage.position;
    const pts = sampleIsland(count, 777, (x, z) => {
      if (distToPond(x, z) < 0.12) return 0;
      if (distToCottage(x, z) < 0.05) return 0;
      if (Math.hypot(x - cx, z - cz) < 0.2) return 0;
      const pd = pathDistance(x, z);
      if (pd < 0.18) return 0.04;
      // Thinner near the rim so the lip reads as a soft edge.
      return 0.55 + 0.45 * smoothstep(0.0, 0.05, insideFactor(x, z)) * smoothstep(0.18, 0.6, pd);
    }, 1.0);
    const im = new InstancedMesh(geometry, material, pts.length);
    const rand = mulberry32(99);
    const m = new Matrix4();
    const q = new Quaternion();
    const qTilt = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const n = new Vector3();
    const s = new Vector3();
    const p = new Vector3();
    const colors = new Float32Array(pts.length * 3);
    const c: [number, number, number] = [0, 0, 0];
    const tip = new Color();
    pts.forEach((pt, i) => {
      const clump = noise2(pt.x * 0.45, pt.z * 0.45);
      const pd = pathDistance(pt.x, pt.z);
      const nearPond = smoothstep(1.2, 0.1, distToPond(pt.x, pt.z));
      let h = 0.26 + 0.14 * clump + rand() * 0.14;
      h *= 0.65 + 0.35 * smoothstep(0.2, 0.9, pd);
      h *= 1 + nearPond * 0.15;
      h *= 0.75 + 0.25 * smoothstep(0.0, 0.1, insideFactor(pt.x, pt.z));
      q.setFromAxisAngle(up, rand() * Math.PI * 2);
      const [nx, ny, nz] = islandNormal(pt.x, pt.z);
      n.set(nx, ny, nz);
      qTilt.setFromUnitVectors(up, n.lerp(up, 0.5).normalize());
      q.premultiply(qTilt);
      s.set(0.85 + rand() * 0.5, h, 0.85 + rand() * 0.5);
      p.set(pt.x, pt.y - 0.01, pt.z);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
      groundColor(pt.x, pt.z, c);
      // Some blades catch a drier, golden tone.
      const dry = Math.max(0, noise2(pt.x * 0.9 + 4, pt.z * 0.9) * 0.9 + rand() * 0.35 - 0.25);
      tip.setRGB(c[0] + dry * 0.18, c[1] + dry * 0.1, c[2] - dry * 0.02);
      colors[i * 3] = srgbToLinear(Math.min(1, tip.r * 1.05));
      colors[i * 3 + 1] = srgbToLinear(Math.min(1, tip.g * 1.08));
      colors[i * 3 + 2] = srgbToLinear(Math.min(1, tip.b));
    });
    im.instanceColor = new InstancedBufferAttribute(colors, 3);
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
    im.frustumCulled = false;
    return im;
  }, [count, geometry, material]);

  useEffect(() => {
    mesh.receiveShadow = shadows;
    mesh.castShadow = false;
  }, [mesh, shadows]);

  useEffect(() => () => mesh.dispose(), [mesh]);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <primitive object={mesh} />;
}
