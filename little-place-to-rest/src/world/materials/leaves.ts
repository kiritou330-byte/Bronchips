import { CanvasTexture, DoubleSide, MeshStandardMaterial, type WebGLProgramParametersWithUniforms } from "three";
import { mulberry32 } from "@/lib/three/noise";
import { shared } from "./shared";
import { windGLSL } from "./wind";

/**
 * A small cluster of leaves drawn on a canvas: alpha-tested silhouettes with a lighter midrib.
 * White-ish so per-card instance colours tint it.
 */
export function leafClusterTexture() {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const rand = mulberry32(73);
  const leaf = (x: number, y: number, len: number, w: number, rot: number, tone: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(0, -len / 2, 0, len / 2);
    const a = Math.round(200 * tone),
      b = Math.round(255 * tone);
    g.addColorStop(0, `rgb(${b},${b},${b})`);
    g.addColorStop(1, `rgb(${a},${a},${a})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.bezierCurveTo(w, -len / 4, w * 0.8, len / 4, 0, len / 2);
    ctx.bezierCurveTo(-w * 0.8, len / 4, -w, -len / 4, 0, -len / 2);
    ctx.fill();
    // midrib
    ctx.strokeStyle = `rgba(255,255,255,0.35)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -len / 2 + 3);
    ctx.lineTo(0, len / 2 - 3);
    ctx.stroke();
    ctx.restore();
  };
  // Back leaves darker, front leaves lighter: a little depth inside one card.
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rand() * 0.5;
    const r = 18 + rand() * 22;
    leaf(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r, 34 + rand() * 14, 12 + rand() * 5, a + Math.PI / 2 + (rand() - 0.5), 0.72 + (i / 9) * 0.28);
  }
  leaf(s / 2, s / 2, 40, 14, rand() * 6, 1);
  const t = new CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

export interface LeafOptions {
  /** World units: cards closer than near vanish, fully sized beyond far (orbit only). */
  shrink: [number, number];
  bendAmp: number;
  translucency: number;
}

/**
 * Camera-facing leaf cards (instanced). Each instance stores its centre and size in the
 * instance matrix and a "fluffy" outward normal in `aLeaf.xyz` (roll angle in `aLeaf.w`).
 * Cards sway with the shared wind field, flutter individually, glow when backlit and
 * shrink away near the camera while orbiting so foreground canopies never block the view.
 */
export function createLeafMaterial(map: CanvasTexture, o: LeafOptions) {
  const m = new MeshStandardMaterial({ map, alphaTest: 0.5, side: DoubleSide, roughness: 0.78 });
  m.customProgramCacheKey = () => `leaf-${o.shrink.join(",")}-${o.bendAmp}-${o.translucency}`;
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uWind = shared.uWind;
    shader.uniforms.uSunDir = shared.uSunDir;
    shader.uniforms.uSunColor = shared.uSunColor;
    shader.uniforms.uAudio = shared.uAudio;
    shader.uniforms.uNearFade = shared.uNearFade;
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>\n${windGLSL}\nattribute vec4 aLeaf;\nuniform float uNearFade;\nvarying float vTransl;`,
      )
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = normalize(aLeaf.xyz);")
      .replace(
        "#include <project_vertex>",
        /* glsl */ `
        vec3 cLocal = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float size = length(instanceMatrix[0].xyz);
        vec3 wOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec4 wc = modelMatrix * vec4(cLocal, 1.0);
        float hgt = max(wc.y - wOrigin.y, 0.0);
        // Whole canopy sways from the trunk base; each card also flutters on its own.
        wc.xyz += windField(wOrigin, wc.xyz, 0.0) * hgt * hgt * ${o.bendAmp.toFixed(4)};
        float ph = aLeaf.w * 6.2831;
        wc.xyz += vec3(sin(uTime * 3.1 + ph), sin(uTime * 2.3 + ph * 1.7) * 0.6, cos(uTime * 2.7 + ph)) * 0.018 * uWind * (1.0 + uAudio * 0.6);
        float camD = length(wc.xyz - cameraPosition);
        size *= mix(1.0, smoothstep(${o.shrink[0].toFixed(2)}, ${o.shrink[1].toFixed(2)}, camD), uNearFade);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        float roll = aLeaf.w * 6.2831 + sin(uTime * 1.3 + ph) * 0.12;
        vec2 q = vec2(position.x * cos(roll) - position.y * sin(roll), position.x * sin(roll) + position.y * cos(roll));
        vec3 wPos = wc.xyz + (right * q.x + up * q.y) * size;
        vec4 mvPosition = viewMatrix * vec4(wPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vec3 vdir = normalize(wPos - cameraPosition);
        vTransl = pow(max(dot(vdir, uSunDir), 0.0), 3.0);
        `,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform vec3 uSunColor;\nvarying float vTransl;`)
      .replace(
        "#include <opaque_fragment>",
        `outgoingLight += uSunColor * diffuseColor.rgb * vTransl * ${o.translucency.toFixed(3)};\n#include <opaque_fragment>`,
      );
  };
  m.needsUpdate = true;
  return m;
}
