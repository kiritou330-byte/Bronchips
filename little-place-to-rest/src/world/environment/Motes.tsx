"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial } from "three";
import { mulberry32 } from "@/lib/three/noise";
import { islandHeight } from "@/lib/three/terrain";
import { layout } from "@/config/world.config";
import { shared } from "../materials/shared";

type Kind = "dust" | "firefly";

/**
 * Floating light particles.
 * - dust: warm motes drifting slowly in the sunlight around the island.
 * - firefly: glowing dots that wander low near the pond and bushes, brightest at night.
 */
export function Motes({ kind, count }: { kind: Kind; count: number }) {
  const dpr = useThree((s) => s.viewport.dpr);

  const geometry = useMemo(() => {
    const rand = mulberry32(kind === "dust" ? 31 : 47);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 4);
    const [px, pz] = layout.pond.position;
    for (let i = 0; i < count; i++) {
      let x: number, y: number, z: number;
      if (kind === "dust") {
        const a = rand() * Math.PI * 2;
        const r = Math.sqrt(rand()) * 13;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        y = -1.5 + rand() * 8;
      } else {
        // Half around the pond, half scattered over the meadow.
        const nearPond = rand() < 0.5;
        const a = rand() * Math.PI * 2;
        const r = nearPond ? 0.6 + rand() * 2.4 : Math.sqrt(rand()) * 7.5;
        x = (nearPond ? px : 0) + Math.cos(a) * r;
        z = (nearPond ? pz : 0) + Math.sin(a) * r;
        y = islandHeight(x, z) + 0.25 + rand() * 1.6;
      }
      pos.set([x, y, z], i * 3);
      seed.set([rand(), rand(), rand(), rand()], i * 4);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new BufferAttribute(seed, 4));
    return g;
  }, [count, kind]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: shared.uTime,
          uSunColor: shared.uSunColor,
          uNight: shared.uNight,
          uFireflies: shared.uFireflies,
          uAudio: shared.uAudio,
          uPixelRatio: { value: 1 },
          uColor: { value: new Color(kind === "dust" ? "#FFE3B0" : "#E9F7A0") },
          uSize: { value: kind === "dust" ? 0.06 : 0.13 },
          uKind: { value: kind === "dust" ? 0 : 1 },
        },
        vertexShader: /* glsl */ `
          uniform float uTime, uPixelRatio, uSize, uKind, uAudio;
          attribute vec4 aSeed;
          varying float vAlpha;
          varying float vSeed;
          void main() {
            vec3 p = position;
            float t = uTime * (0.25 + aSeed.x * 0.35);
            float ph = aSeed.y * 6.2831;
            if (uKind < 0.5) {
              // Lazy drift + slow rise, wrapping vertically.
              p.x += sin(t + ph) * 0.9 + sin(t * 0.37 + ph * 2.0) * 0.6;
              p.z += cos(t * 0.8 + ph) * 0.9;
              p.y += mod(uTime * (0.05 + aSeed.z * 0.06) + aSeed.w * 8.0, 8.0) - 4.0;
            } else {
              // Fireflies wander in small loops.
              p.x += sin(t * 1.3 + ph) * 0.55 + sin(t * 2.7 + ph) * 0.12;
              p.z += cos(t * 1.1 + ph * 1.3) * 0.55;
              p.y += sin(t * 1.7 + ph) * 0.22;
            }
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            float audio = 1.0 + uAudio * 0.35 * aSeed.z;
            gl_PointSize = uSize * audio * uPixelRatio * (420.0 / -mv.z);
            // Fade with distance and near the camera.
            float d = -mv.z;
            vAlpha = smoothstep(0.8, 3.0, d) * (1.0 - smoothstep(30.0, 60.0, d));
            vSeed = aSeed.w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime, uNight, uFireflies, uKind;
          uniform vec3 uColor, uSunColor;
          varying float vAlpha;
          varying float vSeed;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            float core = smoothstep(0.5, 0.0, d);
            float glow = pow(core, 2.2);
            vec3 col;
            float a;
            if (uKind < 0.5) {
              col = mix(uColor, uSunColor, 0.5);
              float tw = 0.55 + 0.45 * sin(uTime * (0.8 + vSeed * 1.6) + vSeed * 30.0);
              a = glow * tw * 0.55 * (1.0 - uNight * 0.75);
            } else {
              // Slow organic blink: mostly on, occasionally dims.
              float b = sin(uTime * (0.9 + vSeed * 0.8) + vSeed * 40.0);
              float blink = smoothstep(-0.6, 0.6, b);
              col = uColor;
              a = (glow * 1.1 + pow(core, 8.0)) * blink * uFireflies;
            }
            gl_FragColor = vec4(col * a * vAlpha, 1.0);
            #include <colorspace_fragment>
          }
        `,
      }),
    [kind],
  );

  useFrame(() => {
    material.uniforms.uPixelRatio.value = dpr;
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={10} />;
}
