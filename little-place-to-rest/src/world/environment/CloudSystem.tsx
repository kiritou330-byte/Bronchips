"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from "three";
import { fbm2, mulberry32 } from "@/lib/three/noise";
import type { Quality } from "@/state/world";
import { live, shared } from "../materials/shared";

// Custom billboard clouds. Each puff knows the centre of its cloud, so it can be shaded
// like a volume: warm sunlit tops, cool shaded bases, silver lining when backlit.

interface Puff {
  pos: Vector3;
  center: Vector3;
  size: number;
  rot: number;
  phase: number;
  opacity: number;
}

export function puffTexture() {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 2 - 1;
      const v = (y / size) * 2 - 1;
      const d = Math.sqrt(u * u + v * v);
      const n = fbm2(u * 2.2 + 3, v * 2.2 - 1, 4) * 0.5 + 0.5;
      // Soft body with a billowy, noise-broken edge.
      const edge = 1 - smooth(0.45 + n * 0.35, 1.0, d);
      const a = Math.pow(Math.max(0, edge), 1.6) * (0.75 + 0.25 * n);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** A cumulus: flat-ish base, rounded billowing top. */
function cumulus(center: Vector3, width: number, height: number, depth: number, count: number, rand: () => number, out: Puff[], baseSize: number) {
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const x = Math.cos(a) * r * width * 0.5;
    const z = Math.sin(a) * r * depth * 0.5;
    // Taller in the middle, flat at the bottom.
    const hy = (1 - r * r) * height * (0.4 + rand() * 0.6);
    out.push({
      pos: new Vector3(center.x + x, center.y + hy, center.z + z),
      center: center.clone().add(new Vector3(0, height * 0.25, 0)),
      size: baseSize * (0.75 + rand() * 0.5) * (1.1 - r * 0.35),
      rot: rand() * Math.PI * 2,
      phase: rand() * 10,
      opacity: 0.8 + rand() * 0.2,
    });
  }
}

export function buildCloudPuffs(quality: Quality) {
  const density = quality === "high" ? 1 : quality === "medium" ? 0.72 : 0.5;
  const rand = mulberry32(12);
  const puffs: Puff[] = [];
  // Sea of clouds below the island: a broad, continuous layer of big puffs.
  const sea = Math.round(150 * density);
  for (let i = 0; i < sea; i++) {
    const a = rand() * Math.PI * 2;
    const r = 6 + Math.pow(rand(), 0.75) * 95;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const y = -17 + fbm2(x * 0.04, z * 0.04, 3) * 5 + rand() * 1.5;
    const center = new Vector3(x, y - 3, z);
    puffs.push({
      pos: new Vector3(x, y, z),
      center,
      size: Math.min(13 + rand() * 12 + r * 0.08, 5 + r * 0.55),
      rot: rand() * Math.PI * 2,
      phase: rand() * 10,
      opacity: 0.85,
    });
  }
  // Drifting cumulus around the island and along the arrival corridor.
  const cumuli: [number, number, number, number, number, number][] = [
    // x, y, z, width, height, count
    [-27, 1.5, -20, 11, 4, 12],
    [31, 3.5, -12, 12, 4.5, 12],
    [23, -2.5, 27, 9, 3.5, 10],
    [-35, -0.5, 16, 10, 3.5, 10],
    [-27, 3.5, 52, 8, 3, 9],
    [-16, 1.4, 37, 6, 2.2, 7],
    [-38, 7, 62, 9, 3, 9],
    [6, 6, -42, 14, 5, 13],
    [44, 8, 18, 12, 4, 10],
  ];
  cumuli.forEach(([x, y, z, w, h, n]) => {
    cumulus(new Vector3(x, y, z), w, h, w * 0.55, Math.max(4, Math.round(n * (0.6 + density * 0.4))), rand, puffs, w * 0.42);
  });
  return puffs;
}

/** Shared cloud shader: volume-like shading, silver lining, fog, premultiplied alpha. */
export function createCloudMaterial(texture: CanvasTexture) {
  const m = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uMap: { value: texture },
      uTime: shared.uTime,
      uSunDir: shared.uSunDir,
      uSunColor: shared.uSunColor,
      uShade: shared.uCloudShade,
      uSkyTop: shared.uSkyTop,
      uHorizon: shared.uSkyHorizon,
      uNight: shared.uNight,
      uFogColor: { value: new Color() },
      uFogDensity: { value: 0.01 },
      uGlow: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aCenter;
      attribute vec4 aParams; // size, rotation, phase, opacity
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vCenter;
      varying float vOpacity;
      varying float vFogDepth;
      void main() {
        vUv = uv;
        vec3 center = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float size = aParams.x * (1.0 + 0.04 * sin(uTime * 0.25 + aParams.z));
        float rot = aParams.y + uTime * 0.01 * (fract(aParams.z) - 0.5);
        vec2 q = vec2(position.x * cos(rot) - position.y * sin(rot), position.x * sin(rot) + position.y * cos(rot));
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 world = center + (right * q.x + up * q.y) * size;
        vWorld = world;
        vCenter = aCenter;
        vec4 mv = viewMatrix * vec4(world, 1.0);
        vFogDepth = -mv.z;
        // Fade puffs that get very close to the camera (flying through clouds).
        vOpacity = aParams.w * smoothstep(size * 0.25, size * 0.9, vFogDepth);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform vec3 uSunDir, uSunColor, uShade, uSkyTop, uHorizon, uFogColor;
      uniform float uNight, uFogDensity, uGlow;
      varying vec2 vUv;
      varying vec3 vWorld;
      varying vec3 vCenter;
      varying float vOpacity;
      varying float vFogDepth;
      void main() {
        float a = texture2D(uMap, vUv).a * vOpacity;
        if (a < 0.004) discard;
        vec3 n = normalize(vWorld - vCenter + vec3(0.0, 0.0001, 0.0));
        vec3 sd = normalize(uSunDir);
        float lit = clamp(dot(n, sd) * 0.5 + 0.5, 0.0, 1.0);
        float topness = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
        // Ambient from the sky, shaded base, warm sunlit side.
        vec3 base = mix(uShade, mix(uHorizon, vec3(1.0), 0.55), topness);
        vec3 sunlit = mix(vec3(1.0), uSunColor, 0.55) * 1.15;
        vec3 col = mix(base, sunlit, smoothstep(0.35, 1.0, lit) * (1.0 - uNight * 0.6));
        // Thin edges glow when the sun is behind the cloud (silver lining).
        vec3 vd = normalize(vWorld - cameraPosition);
        float back = pow(max(dot(vd, sd), 0.0), 6.0);
        col += uSunColor * back * (1.0 - a) * 1.2;
        col = mix(col, uShade * 0.75 + uSkyTop * 0.25, uNight * 0.82);
        // Affordance shimmer for touchable clouds: warm light on thin edges.
        col += vec3(1.0, 0.86, 0.62) * uGlow * (1.0 - a) * 0.9;
        // Exponential-squared fog, same as the scene.
        float f = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        col = mix(col, uFogColor, f);
        gl_FragColor = vec4(col * a, a);
        #include <colorspace_fragment>
      }
    `,
  });
  m.premultipliedAlpha = true;
  m.blending = CustomBlending;
  m.blendSrc = OneFactor;
  m.blendDst = OneMinusSrcAlphaFactor;
  return m;
}

const tmpObj = new Object3D();
const camPos = new Vector3();

export function CloudSystem({ quality }: { quality: Quality }) {
  const puffs = useMemo(() => buildCloudPuffs(quality), [quality]);
  const texture = useMemo(() => puffTexture(), []);
  const order = useRef<number[]>([]);
  const frame = useRef(0);

  const material = useMemo(() => createCloudMaterial(texture), [texture]);

  const mesh = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    const m = new InstancedMesh(geo, material, puffs.length);
    const centers = new Float32Array(puffs.length * 3);
    const params = new Float32Array(puffs.length * 4);
    geo.setAttribute("aCenter", new InstancedBufferAttribute(centers, 3));
    geo.setAttribute("aParams", new InstancedBufferAttribute(params, 4));
    m.frustumCulled = false;
    m.renderOrder = 2;
    order.current = puffs.map((_, i) => i);
    return m;
  }, [puffs, material]);

  const write = () => {
    const centers = mesh.geometry.getAttribute("aCenter") as InstancedBufferAttribute;
    const params = mesh.geometry.getAttribute("aParams") as InstancedBufferAttribute;
    order.current.forEach((pi, slot) => {
      const p = puffs[pi];
      tmpObj.position.copy(p.pos);
      tmpObj.updateMatrix();
      mesh.setMatrixAt(slot, tmpObj.matrix);
      centers.setXYZ(slot, p.center.x, p.center.y, p.center.z);
      params.setXYZW(slot, p.size, p.rot, p.phase, p.opacity);
    });
    mesh.instanceMatrix.needsUpdate = true;
    centers.needsUpdate = true;
    params.needsUpdate = true;
  };

  useFrame((state, dt) => {
    material.uniforms.uFogColor.value.copy(live.fogColor);
    material.uniforms.uFogDensity.value = live.fogDensity;
    // Slow drift of every puff around the island.
    const d = Math.min(dt, 0.1) * 0.012;
    const c = Math.cos(d),
      s = Math.sin(d);
    for (const p of puffs) {
      const x = p.pos.x,
        z = p.pos.z;
      p.pos.x = x * c - z * s;
      p.pos.z = x * s + z * c;
      const cx = p.center.x,
        cz = p.center.z;
      p.center.x = cx * c - cz * s;
      p.center.z = cx * s + cz * c;
    }
    // Back-to-front sort (every other frame is plenty for slow clouds).
    if (frame.current++ % 2 === 0) {
      camPos.copy(state.camera.position);
      order.current.sort((a, b) => puffs[b].pos.distanceToSquared(camPos) - puffs[a].pos.distanceToSquared(camPos));
    }
    write();
  });

  useEffect(
    () => () => {
      mesh.geometry.dispose();
    },
    [mesh],
  );
  useEffect(
    () => () => {
      material.dispose();
      texture.dispose();
    },
    [material, texture],
  );

  return <primitive object={mesh} />;
}
