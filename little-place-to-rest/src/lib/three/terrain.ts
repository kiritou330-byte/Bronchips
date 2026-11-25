import { layout } from "@/config/world.config";
import { clamp, fbm2, lerp, mulberry32, noise2, smoothstep } from "./noise";

// One shared definition of the island's surface. Geometry, grass, trees and props all
// sample these functions so everything sits exactly on the ground.

const R = layout.islandRadius;
const [cx, cz] = layout.cottage.position;
const [px, pz] = layout.pond.position;
const pondR = layout.pond.radius;

/** Organic outline: radius of the island rim for a given angle. */
export function islandRadiusAt(angle: number): number {
  const a = angle;
  const n =
    0.06 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 5 + 2.1) + 0.05 * noise2(Math.cos(a) * 1.4, Math.sin(a) * 1.4);
  return R * (1 + n);
}

function rawHeight(x: number, z: number): number {
  const r = Math.hypot(x, z) / islandRadiusAt(Math.atan2(z, x));
  // Gentle dome with a soft shoulder before the rim.
  let h = 0.75 * (1 - Math.pow(Math.min(r, 1.2), 2.4));
  // Rolling hills.
  h += 0.42 * fbm2(x * 0.11 + 3.1, z * 0.11 - 1.7, 4);
  // A small rise behind the cottage gives the silhouette some shape.
  h += 0.9 * Math.exp(-((x + 5) ** 2 + (z + 4.6) ** 2) / 9);
  h += 0.35 * Math.exp(-((x - 5.5) ** 2 + (z + 3.5) ** 2) / 6);
  return h;
}

const cottageBase = rawHeight(cx, cz);
const pondRim = rawHeight(px, pz) - 0.05;
export const pondWaterLevel = pondRim - 0.1;

/** Ground height at (x, z). */
export function islandHeight(x: number, z: number): number {
  let h = rawHeight(x, z);

  // Flat pad for the cottage.
  const dc = Math.hypot(x - cx, z - cz);
  h = lerp(cottageBase, h, smoothstep(1.7, 2.8, dc));

  // Pond basin.
  const dp = Math.hypot(x - px, z - pz) / pondR;
  const rimH = lerp(pondRim, h, smoothstep(1.0, 1.7, dp));
  const bowl = pondWaterLevel - 0.42 * (1 - Math.pow(Math.min(dp, 1), 2));
  h = dp < 1 ? lerp(bowl, pondRim, smoothstep(0.55, 1.0, dp)) : rimH;

  // Path is very slightly sunken.
  h -= 0.04 * (1 - smoothstep(0.0, 0.5, pathDistance(x, z)));

  // Soft lip that rolls over the edge.
  const rn = Math.hypot(x, z) / islandRadiusAt(Math.atan2(z, x));
  h -= Math.pow(smoothstep(0.95, 1.02, rn), 2) * 0.4;
  return h;
}

/** Approximate surface normal via central differences. */
export function islandNormal(x: number, z: number): [number, number, number] {
  const e = 0.08;
  const hx = islandHeight(x + e, z) - islandHeight(x - e, z);
  const hz = islandHeight(x, z + e) - islandHeight(x, z - e);
  const nx = -hx,
    ny = 2 * e,
    nz = -hz;
  const l = Math.hypot(nx, ny, nz);
  return [nx / l, ny / l, nz / l];
}

function segDist(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax,
    dz = bz - az;
  const t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
}

/** Distance (top-down) to the dirt path, with a little meander. */
export function pathDistance(x: number, z: number): number {
  const p = layout.path;
  let d = Infinity;
  for (let i = 0; i < p.length - 1; i++) d = Math.min(d, segDist(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d + 0.12 * noise2(x * 1.3, z * 1.3);
}

/** 0..1 how "inside" a point is (1 = centre, 0 = rim). */
export function insideFactor(x: number, z: number): number {
  return 1 - Math.hypot(x, z) / islandRadiusAt(Math.atan2(z, x));
}

export function distToPond(x: number, z: number) {
  return Math.hypot(x - px, z - pz) - pondR;
}

/** Signed-ish distance to the cottage footprint (rotated rectangle). */
export function distToCottage(x: number, z: number) {
  const a = -layout.cottage.rotationY;
  const dx = x - cx,
    dz = z - cz;
  const lx = dx * Math.cos(a) - dz * Math.sin(a);
  const lz = dx * Math.sin(a) + dz * Math.cos(a);
  const qx = Math.abs(lx) - 1.45;
  const qz = Math.abs(lz) - 1.25;
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
}

/** Ground colour used by both the terrain vertices and grass roots so they blend. */
export function groundColor(x: number, z: number, out: [number, number, number]) {
  const n = fbm2(x * 0.35, z * 0.35, 3);
  const n2 = noise2(x * 1.7 + 9, z * 1.7 - 3);
  // Base meadow greens (linear-ish sRGB values, converted by the material).
  const dark = [0.33, 0.45, 0.23];
  const light = [0.63, 0.69, 0.35];
  const t = clamp(0.5 + n * 0.9 + n2 * 0.12, 0, 1);
  let r = lerp(dark[0], light[0], t),
    g = lerp(dark[1], light[1], t),
    b = lerp(dark[2], light[2], t);
  // Dirt path.
  const pd = smoothstep(0.55, 0.15, pathDistance(x, z));
  r = lerp(r, 0.6, pd);
  g = lerp(g, 0.49, pd);
  b = lerp(b, 0.34, pd);
  // Damp earth around the pond.
  const dp = distToPond(x, z);
  const pondEdge = smoothstep(0.55, -0.05, dp);
  r = lerp(r, 0.36, pondEdge);
  g = lerp(g, 0.33, pondEdge);
  b = lerp(b, 0.24, pondEdge);
  // Packed soil under the cottage.
  const cd = smoothstep(0.4, -0.2, distToCottage(x, z));
  r = lerp(r, 0.42, cd);
  g = lerp(g, 0.36, cd);
  b = lerp(b, 0.27, cd);
  out[0] = r;
  out[1] = g;
  out[2] = b;
  return out;
}

export const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);

export interface SamplePoint {
  x: number;
  z: number;
  y: number;
}

/**
 * Rejection-sample points on the island top.
 * `accept` returns a probability (0..1) to keep the point.
 */
export function sampleIsland(
  count: number,
  seed: number,
  accept: (x: number, z: number) => number,
  maxInside = 0.97,
): SamplePoint[] {
  const rand = mulberry32(seed);
  const pts: SamplePoint[] = [];
  let guard = count * 40;
  while (pts.length < count && guard-- > 0) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * islandRadiusAt(a) * maxInside;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (rand() > accept(x, z)) continue;
    pts.push({ x, z, y: islandHeight(x, z) });
  }
  return pts;
}
