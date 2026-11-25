"use client";

import { useEffect, useMemo } from "react";
import { BufferAttribute, BufferGeometry, Color, ConeGeometry, MeshStandardMaterial, Vector3 } from "three";
import { layout } from "@/config/world.config";
import { foliageCluster, mergeGeometries, mergeVertices, taperedTube, type FoliagePalette } from "@/lib/three/geometry";
import { mulberry32, noise3 } from "@/lib/three/noise";
import { islandHeight } from "@/lib/three/terrain";
import { applyWind } from "../materials/wind";

const oakPalette: FoliagePalette = {
  deep: new Color("#2B4A31"),
  mid: new Color("#557D43"),
  light: new Color("#9BBA5C"),
  warm: new Color("#D6C76C"),
};
const pinePalette: FoliagePalette = {
  deep: new Color("#21392E"),
  mid: new Color("#3A6047"),
  light: new Color("#6F9659"),
  warm: new Color("#8FA35A"),
};
const bushPalette: FoliagePalette = {
  deep: new Color("#27402C"),
  mid: new Color("#4C7140"),
  light: new Color("#8EAE58"),
  warm: new Color("#B9B862"),
};

function buildOak(seed: number, detail: number) {
  const rand = mulberry32(seed);
  const lean = new Vector3((rand() - 0.5) * 0.5, 0, (rand() - 0.5) * 0.5);
  const H = 2.6 + rand() * 0.5;
  const trunkPts = [
    new Vector3(0, -0.35, 0),
    new Vector3(lean.x * 0.2, H * 0.35, lean.z * 0.2),
    new Vector3(lean.x * 0.6 - 0.05, H * 0.72, lean.z * 0.6 + 0.05),
    new Vector3(lean.x, H, lean.z),
  ];
  const wood: BufferGeometry[] = [taperedTube(trunkPts, 0.3, 0.12, { flare: 0.28, seed, radial: 10 })];
  const crown = new Vector3(lean.x, H + 0.75, lean.z);
  const blobs = [{ center: crown.clone(), radius: 1.45 + rand() * 0.2 }];
  const n = 5 + Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.6;
    const d = 0.95 + rand() * 0.45;
    const c = new Vector3(Math.cos(a) * d, (rand() - 0.35) * 0.9, Math.sin(a) * d).add(crown);
    blobs.push({ center: c, radius: 0.85 + rand() * 0.35 });
    // A branch reaching into the side clumps.
    if (i % 2 === 0) {
      const from = new Vector3(lean.x * 0.7, H * 0.78, lean.z * 0.7);
      const mid = from.clone().lerp(c, 0.55).add(new Vector3(0, 0.25, 0));
      wood.push(taperedTube([from, mid, c.clone().lerp(crown, 0.25)], 0.09, 0.035, { seed: seed + i, radial: 6, lengthSegs: 6 }));
    }
  }
  blobs.push({ center: crown.clone().add(new Vector3(0.2, 0.95, -0.15)), radius: 0.95 });
  const foliage = foliageCluster(blobs, oakPalette, { seed, detail, lumps: 0.3, squashBottom: 0.8 });
  const trunk = mergeGeometries(wood, false)!;
  wood.forEach((w) => w.dispose());
  return { trunk, foliage };
}

/** Stacked, jagged cone tiers with drooping tips. */
function pineTier(radius: number, height: number, y: number, seed: number) {
  const cone = new ConeGeometry(radius, height, 12, 3, false);
  cone.deleteAttribute("uv");
  cone.deleteAttribute("normal");
  const g = mergeVertices(cone);
  cone.dispose();
  const pos = g.attributes.position as BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new Color();
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + height / 2) / height; // 0 bottom .. 1 tip
    const a = Math.atan2(v.z, v.x);
    const r = Math.hypot(v.x, v.z);
    // Jagged skirt + droop at the bottom ring.
    const jag = 1 + Math.sin(a * 7 + seed) * 0.12 * (1 - t) + noise3(v.x * 2 + seed, v.y * 2, v.z * 2) * 0.12;
    const droop = t < 0.05 ? -0.18 - Math.abs(Math.sin(a * 7 + seed)) * 0.12 : 0;
    const k = r > 0 ? jag : 1;
    pos.setXYZ(i, v.x * k, v.y + y + droop, v.z * k);
    tmp.copy(pinePalette.deep).lerp(pinePalette.mid, Math.min(1, t * 1.4));
    tmp.lerp(pinePalette.light, Math.max(0, t - 0.5) * 0.9);
    if (t < 0.12) tmp.lerp(pinePalette.deep, 0.5);
    const patch = noise3(v.x * 2.4 + seed, v.y * 2.4, v.z * 2.4) * 0.5 + 0.5;
    tmp.lerp(pinePalette.warm, Math.max(0, patch - 0.7) * 0.7);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  g.setAttribute("color", new BufferAttribute(colors, 3));
  g.computeVertexNormals();
  // Soften: blend normals towards the cone axis.
  const nrm = g.attributes.normal as BufferAttribute;
  const nn = new Vector3();
  const radial = new Vector3();
  for (let i = 0; i < nrm.count; i++) {
    nn.fromBufferAttribute(nrm, i);
    v.fromBufferAttribute(pos, i);
    radial.set(v.x, 0.45 * radius, v.z).normalize();
    nn.lerp(radial, 0.5).normalize();
    nrm.setXYZ(i, nn.x, nn.y, nn.z);
  }
  return g;
}

function buildPine(seed: number) {
  const rand = mulberry32(seed);
  const H = 4.6 + rand() * 0.6;
  const trunk = taperedTube(
    [new Vector3(0, -0.3, 0), new Vector3(0.03, H * 0.5, 0), new Vector3(0, H, 0.02)],
    0.2,
    0.05,
    { seed, radial: 8, flare: 0.15, color: new Color("#5C4130") },
  );
  const tiers: BufferGeometry[] = [];
  const count = 4;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const r = 1.55 - t * 0.95 + rand() * 0.1;
    const h = 1.75 - t * 0.5;
    const y = 1.35 + t * (H - 1.1) * 0.82;
    tiers.push(pineTier(r, h, y, seed + i * 13));
  }
  const foliage = mergeGeometries(tiers, false)!;
  tiers.forEach((t) => t.dispose());
  return { trunk, foliage };
}

function buildBush(seed: number) {
  const rand = mulberry32(seed);
  const blobs = [{ center: new Vector3(0, 0.45, 0), radius: 0.62 }];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + rand();
    blobs.push({
      center: new Vector3(Math.cos(a) * 0.5, 0.3 + rand() * 0.15, Math.sin(a) * 0.5),
      radius: 0.42 + rand() * 0.15,
    });
  }
  return foliageCluster(blobs, bushPalette, { seed, detail: 2, lumps: 0.3, squashBottom: 0.6 });
}

export function Trees({ shadows, detail = 4 }: { shadows: boolean; detail?: number }) {
  const built = useMemo(
    () =>
      layout.trees.map((t) => ({
        ...t,
        y: islandHeight(t.position[0], t.position[1]),
        geo: t.kind === "oak" ? buildOak(t.seed, detail) : buildPine(t.seed),
      })),
    [detail],
  );
  const bushes = useMemo(
    () =>
      layout.bushes.map((b) => ({ ...b, y: islandHeight(b.position[0], b.position[1]), geo: buildBush(b.seed) })),
    [],
  );

  const mats = useMemo(() => {
    const treeWind = { bendPow: 2, bendAmp: 0.0042, flutter: 0.6, translucency: 0.32, nearFade: [3.5, 7.5] as [number, number] };
    const foliage = applyWind(new MeshStandardMaterial({ vertexColors: true, roughness: 0.82 }), treeWind);
    const bark = applyWind(new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), treeWind);
    const bush = applyWind(new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }), {
      bendPow: 1.5,
      bendAmp: 0.045,
      flutter: 0.4,
      translucency: 0.3,
      audio: 0.4,
      nearFade: [2.0, 4.5],
    });
    return { foliage, bark, bush };
  }, []);

  useEffect(
    () => () => {
      built.forEach((b) => {
        b.geo.trunk.dispose();
        b.geo.foliage.dispose();
      });
      bushes.forEach((b) => b.geo.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [built, bushes, mats],
  );

  return (
    <group>
      {built.map((t) => (
        <group
          key={t.seed}
          position={[t.position[0], t.y, t.position[1]]}
          scale={t.scale}
          rotation={[0, t.seed * 0.7, 0]}
        >
          <mesh geometry={t.geo.trunk} material={mats.bark} castShadow={shadows} receiveShadow={shadows} />
          <mesh geometry={t.geo.foliage} material={mats.foliage} castShadow={shadows} receiveShadow={shadows} />
        </group>
      ))}
      {bushes.map((b) => (
        <mesh
          key={b.seed}
          geometry={b.geo}
          material={mats.bush}
          position={[b.position[0], b.y - 0.08, b.position[1]]}
          scale={b.scale}
          rotation={[0, b.seed, 0]}
          castShadow={shadows}
          receiveShadow={shadows}
        />
      ))}
    </group>
  );
}
