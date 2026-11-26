import { CanvasTexture, RepeatWrapping, SRGBColorSpace, LinearSRGBColorSpace } from "three";
import { mulberry32, noise2 } from "./noise";

// Small procedural textures generated at runtime — nothing is downloaded.

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return c;
}

let cloudUrl: string | null = null;
/** Soft, fluffy cloud puff (white with alpha) as a data URL for drei <Clouds>. */
export function cloudPuffDataURL() {
  if (cloudUrl) return cloudUrl;
  const size = 256;
  const c = canvas(size);
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(42);
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2;
    const d = Math.pow(rand(), 0.7) * size * 0.26;
    const x = size / 2 + Math.cos(a) * d;
    const y = size / 2 + Math.sin(a) * d * 0.8;
    const r = size * (0.1 + rand() * 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const alpha = 0.07 + rand() * 0.06;
    g.addColorStop(0, `rgba(255,255,255,${alpha})`);
    g.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.55})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  // Final round falloff so the sprite never shows a hard edge.
  const img = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - size / 2) / (size / 2);
      const dy = (y - size / 2) / (size / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const fall = Math.max(0, 1 - Math.pow(d, 2.2));
      const n = 0.85 + 0.15 * noise2(x * 0.05, y * 0.05);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.min(255, img.data[i + 3] * fall * n * 1.25);
    }
  }
  ctx.putImageData(img, 0, 0);
  cloudUrl = c.toDataURL("image/png");
  return cloudUrl;
}

/** Wooden planks: colour map + matching bump map. Planks run along U. */
export function woodTextures(opts: { planks?: number; base?: [number, number, number]; seed?: number } = {}) {
  const size = 512;
  const planks = opts.planks ?? 6;
  const [br, bg, bb] = opts.base ?? [122, 86, 56];
  const rand = mulberry32(opts.seed ?? 7);
  const color = canvas(size);
  const bump = canvas(size);
  const cc = color.getContext("2d")!;
  const bc = bump.getContext("2d")!;
  const ci = cc.createImageData(size, size);
  const bi = bc.createImageData(size, size);
  const plankH = size / planks;
  const tones = Array.from({ length: planks }, () => 0.82 + rand() * 0.3);
  const offsets = Array.from({ length: planks }, () => rand() * 1000);
  for (let y = 0; y < size; y++) {
    const p = Math.floor(y / plankH);
    const inP = (y % plankH) / plankH;
    for (let x = 0; x < size; x++) {
      const grain =
        noise2((x + offsets[p]) * 0.012, y * 0.28) * 0.5 + noise2((x + offsets[p]) * 0.05, y * 0.9) * 0.18;
      const knot = Math.max(0, noise2((x + offsets[p]) * 0.02, y * 0.05) - 0.62) * 2.2;
      const seam = inP < 0.04 || inP > 0.96 ? 0.45 : 1;
      const edge = 1 - Math.pow(Math.abs(inP - 0.5) * 2, 6) * 0.25;
      const k = tones[p] * (0.86 + grain * 0.28) * seam * edge * (1 - knot * 0.35);
      const i = (y * size + x) * 4;
      ci.data[i] = Math.min(255, br * k);
      ci.data[i + 1] = Math.min(255, bg * k);
      ci.data[i + 2] = Math.min(255, bb * k);
      ci.data[i + 3] = 255;
      const h = (seam < 1 ? 0 : 200 * edge) + grain * 40;
      bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = Math.max(0, Math.min(255, h));
      bi.data[i + 3] = 255;
    }
  }
  cc.putImageData(ci, 0, 0);
  bc.putImageData(bi, 0, 0);
  const map = new CanvasTexture(color);
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = RepeatWrapping;
  map.anisotropy = 4;
  const bumpMap = new CanvasTexture(bump);
  bumpMap.colorSpace = LinearSRGBColorSpace;
  bumpMap.wrapS = bumpMap.wrapT = RepeatWrapping;
  return { map, bumpMap };
}
