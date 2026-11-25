"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { mulberry32 } from "@/lib/three/noise";
import { live, shared } from "../materials/shared";

/**
 * Petals and small leaves drifting down through the light (LotusPath's sakura, Bruno's autumn
 * leaves — here as a quiet golden-hour fall). Fully simulated on the GPU: one draw call.
 */
export function FallingPetals({ count }: { count: number }) {
  const geometry = useMemo(() => {
    const base = new PlaneGeometry(1, 1, 2, 2);
    const g = new InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.getAttribute("position"));
    g.setAttribute("uv", base.getAttribute("uv"));
    const rand = mulberry32(606);
    const spawn = new Float32Array(count * 4); // x, z, phase, speed
    const spin = new Float32Array(count * 4); // axis xyz, rate
    const tint = new Float32Array(count * 4); // rgb, kind (0 petal, 1 leaf)
    const petals = ["#F6D4D2", "#F9E3D0", "#EFC3CF", "#FBEFE4"].map((c) => new Color(c));
    const leaves = ["#D9B15A", "#C98F45", "#B7A04E"].map((c) => new Color(c));
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 11;
      spawn.set([Math.cos(a) * r, Math.sin(a) * r, rand(), 0.18 + rand() * 0.16], i * 4);
      const ax = rand() - 0.5,
        ay = rand() - 0.5,
        az = rand() - 0.5;
      const l = Math.hypot(ax, ay, az) || 1;
      spin.set([ax / l, ay / l, az / l, 0.6 + rand() * 1.4], i * 4);
      const leaf = rand() < 0.35;
      const c = leaf ? leaves[Math.floor(rand() * leaves.length)] : petals[Math.floor(rand() * petals.length)];
      tint.set([c.r, c.g, c.b, leaf ? 1 : 0], i * 4);
    }
    g.setAttribute("aSpawn", new InstancedBufferAttribute(spawn, 4));
    g.setAttribute("aSpin", new InstancedBufferAttribute(spin, 4));
    g.setAttribute("aTint", new InstancedBufferAttribute(tint, 4));
    g.instanceCount = count;
    base.dispose();
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: shared.uTime,
          uWind: shared.uWind,
          uSunDir: shared.uSunDir,
          uSunColor: shared.uSunColor,
          uNight: shared.uNight,
          uAudio: shared.uAudio,
          uPetalAmount: shared.uPetalAmount,
          uFogColor: { value: new Color() },
          uFogDensity: { value: 0.01 },
          uAmbient: { value: new Color() },
        },
        vertexShader: /* glsl */ `
          uniform float uTime, uWind, uAudio, uPetalAmount;
          attribute vec4 aSpawn;
          attribute vec4 aSpin;
          attribute vec4 aTint;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec4 vTint;
          varying float vFade;
          varying float vFogDepth;
          varying vec3 vWorld;

          mat3 axisAngle(vec3 a, float t) {
            float c = cos(t), s = sin(t), k = 1.0 - c;
            return mat3(c + a.x*a.x*k, a.y*a.x*k + a.z*s, a.z*a.x*k - a.y*s,
                        a.x*a.y*k - a.z*s, c + a.y*a.y*k, a.z*a.y*k + a.x*s,
                        a.x*a.z*k + a.y*s, a.y*a.z*k - a.x*s, c + a.z*a.z*k);
          }

          void main() {
            vUv = uv;
            vTint = aTint;
            const float H = 10.0;          // fall height
            float speed = aSpawn.w * (0.75 + uWind * 0.3);
            float t = uTime * speed + aSpawn.z * H;
            float y = 8.0 - mod(t, H);     // from 8 down to -2, then loop
            float life = mod(t, H) / H;
            // Drift with the wind direction + lazy side-to-side sway.
            vec2 dir = normalize(vec2(1.0, 0.42));
            float sway = sin(uTime * (0.7 + aSpin.w * 0.3) + aSpawn.z * 20.0);
            vec3 c = vec3(aSpawn.x, y, aSpawn.y);
            c.xz += dir * life * 3.5 * uWind + vec2(-dir.y, dir.x) * sway * 0.6;
            // Tumble.
            mat3 R = axisAngle(aSpin.xyz, uTime * aSpin.w + aSpawn.z * 9.0);
            float size = aTint.w > 0.5 ? 0.15 : 0.13;
            vec3 local = vec3(position.x * size, position.y * size * 0.62, 0.0);
            local.z += (position.x * position.x) * size * 0.6;   // a little cupped
            vec3 p = c + R * local;
            vNormal = normalize(R * vec3(0.0, 0.0, 1.0));
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            vFogDepth = -mv.z;
            vWorld = p;
            // Appear softly at the top, vanish before the bottom, and never pop in front of the lens.
            // Only part of the population is out at any time; music can call more of it.
            float present = smoothstep(aSpawn.z - 0.06, aSpawn.z, uPetalAmount);
            vFade = present * smoothstep(0.0, 0.08, life) * (1.0 - smoothstep(0.85, 1.0, life)) * smoothstep(0.6, 2.0, vFogDepth);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uSunDir, uSunColor, uFogColor, uAmbient;
          uniform float uNight, uFogDensity;
          varying vec2 vUv;
          varying vec3 vNormal;
          varying vec4 vTint;
          varying float vFade;
          varying float vFogDepth;
          varying vec3 vWorld;
          void main() {
            // Petal / leaf silhouette from the UV (pointed ellipse).
            vec2 q = vUv * 2.0 - 1.0;
            float shape = vTint.w > 0.5
              ? 1.0 - smoothstep(0.85, 1.0, length(vec2(q.x * 1.6, q.y)) + abs(q.y) * 0.25)
              : 1.0 - smoothstep(0.8, 1.0, length(vec2(q.x * 1.25, q.y * 1.05)) + max(q.y, 0.0) * 0.3);
            if (shape < 0.5) discard;
            vec3 n = normalize(vNormal);
            float diff = abs(dot(n, normalize(uSunDir)));
            vec3 v = normalize(vWorld - cameraPosition);
            float back = pow(max(dot(v, normalize(uSunDir)), 0.0), 3.0);
            vec3 col = vTint.rgb * (uAmbient * 0.75 + uSunColor * diff * 0.7) + uSunColor * vTint.rgb * back * 0.6;
            col *= mix(1.0, 0.45, uNight);
            float f = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
            col = mix(col, uFogColor, f);
            gl_FragColor = vec4(col, vFade * (1.0 - uNight * 0.6));
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );

  const mesh = useMemo(() => {
    const m = new Mesh(geometry, material);
    m.frustumCulled = false;
    m.renderOrder = 3;
    return m;
  }, [geometry, material]);

  useFrame(() => {
    material.uniforms.uFogColor.value.copy(live.fogColor);
    material.uniforms.uFogDensity.value = live.fogDensity;
    material.uniforms.uAmbient.value.copy(live.hemiSky).multiplyScalar(live.hemiIntensity);
  });

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <primitive object={mesh} />;
}
