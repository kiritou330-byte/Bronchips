import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  IcosahedronGeometry,
  Vector3,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { fbm3, mulberry32, noise3 } from "./noise";

export { mergeGeometries, mergeVertices };

/** Tube along a curve whose radius tapers, with bark-like vertex colours. */
export function taperedTube(
  points: Vector3[],
  r0: number,
  r1: number,
  opts: { radial?: number; lengthSegs?: number; color?: Color; dark?: Color; seed?: number; flare?: number } = {},
) {
  const radial = opts.radial ?? 9;
  const lengthSegs = opts.lengthSegs ?? 14;
  const curve = new CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(lengthSegs, false);
  const pos: number[] = [];
  const col: number[] = [];
  const base = opts.color ?? new Color("#6B4E37");
  const dark = opts.dark ?? new Color("#3E2C20");
  const tmp = new Color();
  const seed = opts.seed ?? 0;
  const p = new Vector3();
  for (let i = 0; i <= lengthSegs; i++) {
    const t = i / lengthSegs;
    curve.getPointAt(t, p);
    const flare = opts.flare ? opts.flare * Math.pow(1 - t, 6) : 0;
    const r = r0 + (r1 - r0) * Math.pow(t, 0.85) + flare;
    const N = frames.normals[i];
    const B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cos = Math.cos(a),
        sin = Math.sin(a);
      const bump = 1 + noise3(cos * 2 + seed, t * 6, sin * 2) * 0.12;
      const x = p.x + (N.x * cos + B.x * sin) * r * bump;
      const y = p.y + (N.y * cos + B.y * sin) * r * bump;
      const z = p.z + (N.z * cos + B.z * sin) * r * bump;
      pos.push(x, y, z);
      // Vertical bark streaks.
      const streak = noise3(cos * 3 + seed, t * 1.2, sin * 3) * 0.5 + 0.5;
      tmp.copy(base).lerp(dark, streak * 0.7 + (1 - t) * 0.15);
      col.push(tmp.r, tmp.g, tmp.b);
    }
  }
  const index: number[] = [];
  for (let i = 0; i < lengthSegs; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = a + radial + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

export interface BlobSpec {
  center: Vector3;
  radius: number;
}

export interface FoliagePalette {
  deep: Color;
  mid: Color;
  light: Color;
  warm: Color;
}

/**
 * A cluster of lumpy spheres merged into one foliage mass. Normals are blended towards
 * the cluster centre ("spherized"), which gives the soft painterly shading of stylised trees.
 */
export function foliageCluster(
  blobs: BlobSpec[],
  palette: FoliagePalette,
  opts: { detail?: number; seed?: number; lumps?: number; normalBlend?: number; squashBottom?: number } = {},
) {
  const detail = opts.detail ?? 3;
  const seed = opts.seed ?? 0;
  const rand = mulberry32(seed + 1);
  const center = new Vector3();
  let minY = Infinity,
    maxY = -Infinity;
  blobs.forEach((b) => {
    center.add(b.center);
    minY = Math.min(minY, b.center.y - b.radius);
    maxY = Math.max(maxY, b.center.y + b.radius);
  });
  center.divideScalar(blobs.length);
  const parts: BufferGeometry[] = [];
  const tmp = new Color();
  const v = new Vector3();
  const nrm = new Vector3();
  const radial = new Vector3();
  for (const b of blobs) {
    const ico = new IcosahedronGeometry(b.radius, detail);
    ico.deleteAttribute("normal");
    ico.deleteAttribute("uv");
    const g = mergeVertices(ico);
    ico.dispose();
    const pos = g.attributes.position as BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      nrm.copy(v).normalize();
      // Leafy clumps: low-frequency lumps + finer crinkle.
      const lump = fbm3(v.x * 1.1 + seed, v.y * 1.1, v.z * 1.1, 3) * (opts.lumps ?? 0.32) * b.radius;
      const crinkle = noise3(v.x * 4.2 + seed, v.y * 4.2, v.z * 4.2) * 0.028 * b.radius;
      v.addScaledVector(nrm, lump + crinkle);
      if (opts.squashBottom && v.y < 0) v.y *= opts.squashBottom;
      v.add(b.center);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const normals = g.attributes.normal as BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      nrm.fromBufferAttribute(normals, i);
      radial.copy(v).sub(center).normalize();
      nrm.lerp(radial, opts.normalBlend ?? 0.62).normalize();
      normals.setXYZ(i, nrm.x, nrm.y, nrm.z);
      // Colour: darker underneath and inside, lighter & warmer on top.
      const h = (v.y - minY) / Math.max(0.001, maxY - minY);
      const outward = v.clone().sub(center).length() / (b.radius + center.distanceTo(b.center));
      const patch = noise3(v.x * 1.6 + seed, v.y * 1.6, v.z * 1.6) * 0.5 + 0.5;
      tmp.copy(palette.deep).lerp(palette.mid, Math.min(1, h * 1.3));
      tmp.lerp(palette.light, Math.max(0, h - 0.45) * 1.6 * (0.6 + patch * 0.6));
      tmp.lerp(palette.warm, Math.max(0, patch - 0.62) * 1.2 * h);
      tmp.multiplyScalar(0.82 + 0.25 * Math.min(1, outward) + (rand() - 0.5) * 0.04);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    g.setAttribute("color", new BufferAttribute(colors, 3));
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  return merged;
}
