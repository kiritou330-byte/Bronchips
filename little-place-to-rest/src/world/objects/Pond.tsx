"use client";

import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo } from "react";
import { useInteractive } from "@/hooks/useInteractive";
import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  ShaderMaterial,
  Vector3,
} from "three";
import { layout } from "@/config/world.config";
import { mulberry32, noise3 } from "@/lib/three/noise";
import { islandHeight, pondWaterLevel } from "@/lib/three/terrain";
import { live, shared } from "../materials/shared";
import { applyWind } from "../materials/wind";

const [PX, PZ] = layout.pond.position;
const PR = layout.pond.radius;

/** Ripple rings triggered by touches (up to 4 at once). Shared so other code can add ripples. */
export const pondRipples = {
  centers: [new Vector3(), new Vector3(), new Vector3(), new Vector3()],
  starts: [-100, -100, -100, -100],
  next: 0,
  add(x: number, z: number) {
    const i = this.next++ % 4;
    this.centers[i].set(x - PX, 0, z - PZ);
    this.starts[i] = shared.uTime.value;
  },
};

function waterMaterial() {
  return new ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: shared.uTime,
      uSunDir: shared.uSunDir,
      uSunColor: shared.uSunColor,
      uSkyTop: shared.uSkyTop,
      uHorizon: shared.uSkyHorizon,
      uNight: shared.uNight,
      uRadius: { value: PR * 1.08 },
      uDeep: { value: new Color("#21403F") },
      uShallow: { value: new Color("#5C7F67") },
      uFogColor: { value: new Color() },
      uFogDensity: { value: 0.01 },
      uRippleC: { value: pondRipples.centers },
      uRippleT: { value: pondRipples.starts },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vLocal;
      varying float vFogDepth;
      void main() {
        vLocal = position.xy;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vec4 mv = viewMatrix * w;
        vFogDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRadius, uNight, uFogDensity;
      uniform vec3 uSunDir, uSunColor, uSkyTop, uHorizon, uDeep, uShallow, uFogColor;
      uniform vec3 uRippleC[4];
      uniform float uRippleT[4];
      varying vec3 vWorld;
      varying vec2 vLocal;
      varying float vFogDepth;

      // Height field: layered gentle waves + touch ripples.
      float h(vec2 p) {
        float t = uTime;
        float v = sin(p.x * 3.1 + t * 1.1) * 0.012
                + sin(p.y * 2.7 - t * 0.9 + 1.3) * 0.012
                + sin((p.x + p.y) * 6.3 + t * 1.9) * 0.005
                + sin((p.x - p.y) * 9.1 - t * 2.4) * 0.003;
        for (int i = 0; i < 4; i++) {
          float age = t - uRippleT[i];
          if (age > 0.0 && age < 4.0) {
            float d = length(p - uRippleC[i].xz);
            float front = age * 0.55;
            float ring = sin((d - front) * 22.0) * exp(-abs(d - front) * 7.0);
            v += ring * 0.02 * (1.0 - age / 4.0);
          }
        }
        return v;
      }

      void main() {
        // vLocal is in the circle's plane (x, y) -> world (x, -z) after rotation.
        vec2 p = vec2(vLocal.x, -vLocal.y);
        float e = 0.02;
        float dx = (h(p + vec2(e, 0.0)) - h(p - vec2(e, 0.0))) / (2.0 * e);
        float dz = (h(p + vec2(0.0, e)) - h(p - vec2(0.0, e))) / (2.0 * e);
        vec3 n = normalize(vec3(-dx, 1.0, -dz));
        vec3 v = normalize(vWorld - cameraPosition);
        vec3 r = reflect(v, n);
        float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-v, n), 0.0), 5.0);

        // Reflected sky gradient + the sun's warm path on the water.
        vec3 sky = mix(uHorizon, uSkyTop, clamp(r.y * 1.4, 0.0, 1.0));
        vec3 sd = normalize(uSunDir);
        float spec = pow(max(dot(r, sd), 0.0), 220.0) * 3.0 + pow(max(dot(r, sd), 0.0), 18.0) * 0.25;

        float radial = length(vLocal) / uRadius;
        vec3 body = mix(uDeep, uShallow, smoothstep(0.35, 1.0, radial));
        body *= mix(1.0, 0.35, uNight);
        vec3 col = mix(body, sky, fres * 0.85);
        col += uSunColor * spec;
        // Soft shoreline so water meets the bank without a hard edge.
        float alpha = smoothstep(1.0, 0.9, radial);
        float f = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
        col = mix(col, uFogColor, f);
        gl_FragColor = vec4(col, alpha * 0.96);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

/** Rounded stones around the pond rim. */
function rimStones(material: MeshStandardMaterial) {
  const rand = mulberry32(21);
  const base = new IcosahedronGeometry(1, 2);
  const pos = base.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const n = 1 + noise3(x * 1.4, y * 1.4, z * 1.4) * 0.22;
    pos.setXYZ(i, x * n, y * n * 0.6, z * n);
  }
  base.computeVertexNormals();
  const count = 16;
  const mesh = new InstancedMesh(base, material, count);
  const m = new Matrix4();
  const q = new Quaternion();
  const colors = new Float32Array(count * 3);
  const c = new Color();
  let k = 0;
  for (let i = 0; i < count; i++) {
    // Leave an opening towards the path (and the future platform).
    const a = (i / count) * Math.PI * 2 + rand() * 0.2;
    if (Math.cos(a - 3.55) > 0.86) continue;
    const r = PR * (0.98 + rand() * 0.12);
    const x = PX + Math.cos(a) * r;
    const z = PZ + Math.sin(a) * r;
    const s = 0.14 + rand() * 0.16;
    q.setFromAxisAngle(new Vector3(0, 1, 0), rand() * 6);
    m.compose(new Vector3(x, islandHeight(x, z) - s * 0.15, z), q, new Vector3(s * 1.3, s, s));
    mesh.setMatrixAt(k, m);
    c.set("#A39789").multiplyScalar(0.78 + rand() * 0.3);
    colors.set([c.r, c.g, c.b], k * 3);
    k++;
  }
  mesh.count = k;
  mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
  return mesh;
}

/** Reeds clustered on the far bank. */
function reeds(material: MeshStandardMaterial) {
  const rand = mulberry32(33);
  const count = 70;
  // Thin tapered blade, 1 unit tall.
  const pos = new Float32Array([-0.02, 0, 0, 0.02, 0, 0, -0.012, 0.5, 0.02, 0.012, 0.5, 0.02, 0, 1, 0.07]);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  g.computeVertexNormals();
  const mesh = new InstancedMesh(g, material, count);
  const m = new Matrix4();
  const q = new Quaternion();
  for (let i = 0; i < count; i++) {
    const a = 0.4 + rand() * 2.2; // far side of the pond
    const r = PR * (0.88 + rand() * 0.3);
    const x = PX + Math.cos(a) * r;
    const z = PZ + Math.sin(a) * r;
    q.setFromAxisAngle(new Vector3(0, 1, 0), rand() * Math.PI * 2);
    const h = 0.35 + rand() * 0.4;
    m.compose(new Vector3(x, islandHeight(x, z) - 0.05, z), q, new Vector3(1, h, 1));
    mesh.setMatrixAt(i, m);
  }
  return mesh;
}

export function Pond({ shadows }: { shadows: boolean }) {
  const water = useMemo(waterMaterial, []);
  const waterGeo = useMemo(() => new CircleGeometry(PR * 1.08, 64), []);
  const stoneMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.9 }), []);
  const reedMat = useMemo(
    () =>
      applyWind(new MeshStandardMaterial({ color: "#6F8A4A", roughness: 0.85, side: DoubleSide }), {
        bendPow: 1.6,
        bendAmp: 0.18,
        flutter: 0.2,
        translucency: 0.5,
        translucencyHeight: 0.9,
        upNormal: 0.5,
      }),
    [],
  );
  const stones = useMemo(() => rimStones(stoneMat), [stoneMat]);
  const reedMesh = useMemo(() => reeds(reedMat), [reedMat]);
  const pads = useMemo(() => {
    const rand = mulberry32(77);
    return Array.from({ length: 4 }, (_, i) => {
      const a = i * 1.7 + rand();
      const r = PR * (0.25 + rand() * 0.45);
      return { x: PX + Math.cos(a) * r, z: PZ + Math.sin(a) * r, s: 0.16 + rand() * 0.1, rot: rand() * 6, flower: i === 1 };
    });
  }, []);

  // Touching the water sends out a ripple — in the garden and while sitting by the pond.
  const onTap = useCallback((e: ThreeEvent<MouseEvent>) => pondRipples.add(e.point.x, e.point.z), []);
  const { bind } = useInteractive(onTap, true, ["explore", "pond"]);

  useEffect(() => {
    stones.castShadow = shadows;
    stones.receiveShadow = shadows;
  }, [stones, shadows]);

  useFrame(() => {
    water.uniforms.uFogColor.value.copy(live.fogColor);
    water.uniforms.uFogDensity.value = live.fogDensity;
  });

  useEffect(
    () => () => {
      water.dispose();
      waterGeo.dispose();
      stoneMat.dispose();
      reedMat.dispose();
      stones.dispose();
      reedMesh.dispose();
    },
    [water, waterGeo, stoneMat, reedMat, stones, reedMesh],
  );

  return (
    <group>
      <mesh
        geometry={waterGeo}
        material={water}
        position={[PX, pondWaterLevel, PZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
        onClick={bind.onClick}
      />
      <primitive object={stones} />
      <primitive object={reedMesh} />
      {pads.map((p, i) => (
        <group key={i} position={[p.x, pondWaterLevel + 0.012, p.z]} rotation={[0, p.rot, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={shadows}>
            <circleGeometry args={[p.s, 18, 0.35, Math.PI * 2 - 0.35]} />
            <meshStandardMaterial color="#5E8A48" roughness={0.6} side={DoubleSide} />
          </mesh>
          {p.flower && (
            <mesh position={[0.02, 0.03, 0.02]}>
              <icosahedronGeometry args={[0.045, 1]} />
              <meshStandardMaterial color="#F3C3C8" emissive="#F0A8B4" emissiveIntensity={0.15} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
