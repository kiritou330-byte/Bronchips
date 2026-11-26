"use client";

import { useMemo } from "react";
import { BackSide, ShaderMaterial } from "three";
import { shared } from "../materials/shared";

/**
 * Gradient sky dome with a soft sun/moon disc, warm horizon haze and (at night) twinkling stars.
 * Rendered first, ignores fog, never writes depth.
 */
export function Sky() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: shared.uTime,
          uSunDir: shared.uSunDir,
          uSunColor: shared.uSunColor,
          uSkyTop: shared.uSkyTop,
          uSkyHorizon: shared.uSkyHorizon,
          uSkyBottom: shared.uSkyBottom,
          uSunDisc: shared.uSunDisc,
          uSunGlow: shared.uSunGlow,
          uStars: shared.uStars,
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww; // always at the far plane
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uSunDir, uSunColor, uSkyTop, uSkyHorizon, uSkyBottom;
          uniform float uSunDisc, uSunGlow, uStars;
          varying vec3 vDir;

          float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

          void main() {
            vec3 d = normalize(vDir);
            float y = d.y;
            // Smooth three-stop gradient, horizon band slightly wider below the horizon.
            float up = pow(clamp(y, 0.0, 1.0), 0.55);
            float down = pow(clamp(-y, 0.0, 1.0), 0.6);
            vec3 col = mix(uSkyHorizon, uSkyTop, up);
            col = mix(col, uSkyBottom, down);

            vec3 sd = normalize(uSunDir);
            float cosA = dot(d, sd);
            // Wide warm haze around the sun, stronger near the horizon.
            float haze = pow(max(cosA, 0.0), 6.0) * (0.35 + 0.65 * (1.0 - abs(y)));
            col += uSunColor * haze * 0.45 * uSunGlow;
            float halo = pow(max(cosA, 0.0), 64.0);
            col += uSunColor * halo * 0.6 * uSunGlow;
            // Disc with soft edge.
            float disc = smoothstep(1.0 - 0.0009 * uSunDisc, 1.0 - 0.0004 * uSunDisc, cosA);
            col = mix(col, uSunColor * 1.8 + 0.25, disc);

            // Stars (night only): hashed cells on the direction, gentle twinkle.
            if (uStars > 0.001) {
              vec3 cell = floor(d * 220.0);
              float h = hash(cell);
              float star = step(0.9965, h);
              vec3 f = fract(d * 220.0) - 0.5;
              float shape = smoothstep(0.32, 0.0, length(f));
              float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 40.0);
              col += vec3(0.85, 0.9, 1.0) * star * shape * tw * uStars * smoothstep(-0.02, 0.25, y);
            }

            // Subtle dithering to avoid gradient banding.
            col += (hash(vec3(gl_FragCoord.xy, uTime)) - 0.5) / 255.0;
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );

  return (
    <mesh material={material} renderOrder={-1000} frustumCulled={false}>
      <sphereGeometry args={[400, 48, 24]} />
    </mesh>
  );
}
