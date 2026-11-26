"use client";

import { useEffect, useMemo } from "react";
import {
  BufferAttribute,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three";
import { layout } from "@/config/world.config";
import { mergeGeometries } from "@/lib/three/geometry";
import { mulberry32, noise2, smoothstep } from "@/lib/three/noise";
import { distToCottage, distToPond, pathDistance, sampleIsland } from "@/lib/three/terrain";
import { applyWind } from "../materials/wind";

/** Flower head sitting at y = 1 (so instances bend from their base with the wind). */
function headGeometry() {
  const parts: BufferGeometry[] = [];
  const petals = 5;
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const p = new SphereGeometry(1, 7, 5);
    p.scale(0.075, 0.018, 0.042);
    p.rotateZ(0.25);
    p.translate(0.06, 0, 0);
    p.rotateY(a);
    p.translate(0, 1, 0);
    const col = new Float32Array(p.attributes.position.count * 3).fill(1);
    p.setAttribute("color", new BufferAttribute(col, 3));
    p.deleteAttribute("uv");
    parts.push(p);
  }
  const center = new SphereGeometry(0.03, 8, 6);
  center.scale(1, 0.7, 1);
  center.translate(0, 1.012, 0);
  const cc = new Float32Array(center.attributes.position.count * 3);
  for (let i = 0; i < cc.length; i += 3) cc.set([1.6, 1.05, 0.35], i);
  center.setAttribute("color", new BufferAttribute(cc, 3));
  center.deleteAttribute("uv");
  parts.push(center);
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return g;
}

function stemGeometry() {
  const g = new CylinderGeometry(0.008, 0.012, 1, 4, 3, true);
  g.translate(0, 0.5, 0);
  return g;
}

const palette = ["#F6EEDC", "#C2B1DE", "#F2D27C", "#F2B59C", "#FBF7EF", "#9C88C4", "#EFA9A0"].map((c) => new Color(c));

export function Flowers({ count, shadows }: { count: number; shadows: boolean }) {
  const head = useMemo(headGeometry, []);
  const stem = useMemo(stemGeometry, []);
  const wind = { bendPow: 1.5, bendAmp: 0.32, flutter: 0.18, translucency: 0.35, audio: 0.5, touch: 2.6 };
  const headMat = useMemo(
    () => applyWind(new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: DoubleSide }), wind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const stemMat = useMemo(
    () => applyWind(new MeshStandardMaterial({ color: "#4F7A3A", roughness: 0.9 }), wind),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { heads, stems } = useMemo(() => {
    const [cx, cz] = layout.cottage.position;
    const pts = sampleIsland(count, 4242, (x, z) => {
      if (distToPond(x, z) < 0.2 || distToCottage(x, z) < 0.15) return 0;
      if (pathDistance(x, z) < 0.4) return 0;
      // Patches (meadow clumps) + a front garden by the cottage + a ring around the pond.
      const patch = smoothstep(0.15, 0.55, noise2(x * 0.32 + 7, z * 0.32 - 3));
      const garden = smoothstep(2.9, 1.6, Math.hypot(x - cx - 0.9, z - cz - 1.0));
      const pondRing = smoothstep(1.2, 0.3, Math.abs(distToPond(x, z) - 0.55));
      return Math.min(1, patch * 0.9 + garden * 0.9 + pondRing * 0.6 + 0.02);
    }, 0.93);
    const heads = new InstancedMesh(head, headMat, pts.length);
    const stems = new InstancedMesh(stem, stemMat, pts.length);
    const rand = mulberry32(5);
    const m = new Matrix4();
    const q = new Quaternion();
    const s = new Vector3();
    const p = new Vector3();
    const axis = new Vector3();
    const colors = new Float32Array(pts.length * 3);
    pts.forEach((pt, i) => {
      // Colour families per patch so the meadow reads as planted, not random confetti.
      const fam = Math.floor((noise2(pt.x * 0.25, pt.z * 0.25) * 0.5 + 0.5) * palette.length * 0.999);
      const c = palette[rand() < 0.78 ? fam : Math.floor(rand() * palette.length)];
      colors.set([c.r, c.g, c.b], i * 3);
      const h = 0.28 + rand() * 0.24;
      axis.set(rand() - 0.5, 0, rand() - 0.5).normalize();
      q.setFromAxisAngle(axis, (rand() - 0.5) * 0.35);
      const qy = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI * 2);
      q.multiply(qy);
      s.setScalar(h);
      p.set(pt.x, pt.y - 0.02, pt.z);
      m.compose(p, q, s);
      heads.setMatrixAt(i, m);
      stems.setMatrixAt(i, m);
    });
    heads.instanceColor = new InstancedBufferAttribute(colors, 3);
    heads.frustumCulled = false;
    stems.frustumCulled = false;
    return { heads, stems };
  }, [count, head, stem, headMat, stemMat]);

  useEffect(() => {
    heads.castShadow = false;
    heads.receiveShadow = shadows;
    stems.receiveShadow = shadows;
  }, [heads, stems, shadows]);

  useEffect(
    () => () => {
      heads.dispose();
      stems.dispose();
    },
    [heads, stems],
  );
  useEffect(
    () => () => {
      head.dispose();
      stem.dispose();
      headMat.dispose();
      stemMat.dispose();
    },
    [head, stem, headMat, stemMat],
  );

  return (
    <>
      <primitive object={stems} />
      <primitive object={heads} />
    </>
  );
}
