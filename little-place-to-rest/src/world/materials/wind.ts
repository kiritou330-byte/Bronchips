import type { Material, WebGLProgramParametersWithUniforms } from "three";
import { shared } from "./shared";

export interface WindOptions {
  /** Bend = pow(heightAboveOrigin, bendPow) * bendAmp. */
  bendPow: number;
  bendAmp: number;
  /** Extra high-frequency flutter (leaves, petals). */
  flutter?: number;
  /** 0..1 — warm light passing through thin surfaces when looking towards the sun. */
  translucency?: number;
  /** Height (world units) at which translucency reaches full strength. */
  translucencyHeight?: number;
  /** Blend normals towards up (soft grass shading). */
  upNormal?: number;
  /** Additional gentle push from music loudness. */
  audio?: number;
}

/** GLSL shared wind field. Smooth in space so neighbouring blades move together like real gusts. */
export const windGLSL = /* glsl */ `
uniform float uTime;
uniform float uWind;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uAudio;

vec3 windField(vec3 origin, vec3 p, float flutter) {
  vec2 dir = normalize(vec2(1.0, 0.42));
  float along = dot(origin.xz, dir);
  // Slow travelling gusts.
  float gust = sin(along * 0.42 - uTime * 1.25) * 0.5 + 0.5;
  gust *= sin(along * 0.17 + origin.z * 0.21 - uTime * 0.55) * 0.35 + 0.65;
  // Per-object phase so things don't move in lockstep.
  float h = fract(sin(dot(origin.xz, vec2(12.9898, 78.233))) * 43758.5453);
  float sway = sin(uTime * (1.1 + h * 0.6) + h * 6.2831) * 0.35;
  float fl = sin(uTime * 4.3 + p.x * 3.1 + p.z * 2.7 + h * 10.0) * flutter;
  float amt = (0.25 + gust * 0.85 + sway) * uWind;
  vec3 side = vec3(-dir.y, 0.0, dir.x);
  return vec3(dir.x, 0.0, dir.y) * amt + side * (sway * 0.35 + fl) * uWind;
}
`;

/**
 * Patch a built-in material (Standard/Lambert) with world-space wind and optional
 * back-light translucency. Works for instanced and regular meshes.
 */
export function applyWind<T extends Material>(material: T, o: WindOptions): T {
  const key = `wind-${o.bendPow}-${o.bendAmp}-${o.flutter ?? 0}-${o.translucency ?? 0}-${o.upNormal ?? 0}`;
  material.customProgramCacheKey = () => key;
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uWind = shared.uWind;
    shader.uniforms.uSunDir = shared.uSunDir;
    shader.uniforms.uSunColor = shared.uSunColor;
    shader.uniforms.uAudio = shared.uAudio;

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${windGLSL}\nvarying float vTransl;`)
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>\n objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), ${(o.upNormal ?? 0).toFixed(3)}));`,
      )
      .replace(
        "#include <project_vertex>",
        /* glsl */ `
        vec4 wPos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wPos = instanceMatrix * wPos;
          vec3 wOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 wOrigin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #endif
        wPos = modelMatrix * wPos;
        float hgt = max(wPos.y - wOrigin.y, 0.0);
        float bend = pow(hgt, ${o.bendPow.toFixed(3)}) * ${o.bendAmp.toFixed(4)} * (1.0 + uAudio * ${(o.audio ?? 0).toFixed(3)});
        vec3 off = windField(wOrigin, wPos.xyz, ${(o.flutter ?? 0).toFixed(3)}) * bend;
        // Keep length roughly constant: bending pushes the tip down a little.
        off.y -= dot(off.xz, off.xz) * 0.6;
        wPos.xyz += off;
        vec4 mvPosition = viewMatrix * wPos;
        gl_Position = projectionMatrix * mvPosition;
        vec3 vdir = normalize(wPos.xyz - cameraPosition);
        float th = ${(o.translucencyHeight ?? 0).toFixed(3)};
        float tipF = th > 0.0 ? clamp(hgt / th, 0.0, 1.0) : 1.0;
        vTransl = pow(max(dot(vdir, uSunDir), 0.0), 3.0) * tipF;
        `,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\nuniform vec3 uSunColor;\nvarying float vTransl;`)
      .replace(
        "#include <opaque_fragment>",
        `outgoingLight += uSunColor * diffuseColor.rgb * vTransl * ${(o.translucency ?? 0).toFixed(3)};\n#include <opaque_fragment>`,
      );
  };
  material.needsUpdate = true;
  return material;
}
