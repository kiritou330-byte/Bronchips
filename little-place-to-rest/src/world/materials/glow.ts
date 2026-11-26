import { AdditiveBlending, Color, ShaderMaterial } from "three";
import { shared } from "./shared";

/** Soft radial glow for billboards (affordance halos, lantern light, sparkles). */
export function createGlowMaterial(color: string, opacity = 1) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uTime: shared.uTime,
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float g = pow(max(1.0 - d, 0.0), 2.4);
        gl_FragColor = vec4(uColor * g * uOpacity, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

/** One-shot sparkle burst. Call `trigger()` by setting uStart to the current shared time. */
export function createBurstMaterial(color: string) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(color) },
      uTime: shared.uTime,
      uStart: { value: -100 },
      uPixelRatio: { value: 1 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uStart, uPixelRatio;
      attribute vec4 aDir;
      varying float vA;
      void main() {
        float t = clamp((uTime - uStart) / 1.8, 0.0, 1.0);
        float e = 1.0 - pow(1.0 - t, 3.0);
        vec3 p = aDir.xyz * e * (0.45 + aDir.w * 0.5);
        p.y += t * 0.55 - t * t * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.05 + aDir.w * 0.05) * uPixelRatio * (420.0 / -mv.z) * (1.0 - t * 0.5);
        vA = (t > 0.0 && t < 1.0) ? (1.0 - t) * smoothstep(0.0, 0.05, t) : 0.0;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float g = pow(max(1.0 - d, 0.0), 2.0);
        gl_FragColor = vec4(uColor * g * vA * 1.4, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
