"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  TubeGeometry,
  Vector3,
} from "three";
import { useInteractive } from "@/hooks/useInteractive";
import { clamp, lerp, mulberry32, noise2, noise3, smoothstep } from "@/lib/three/noise";
import { srgbToLinear } from "@/lib/three/terrain";
import { woodTextures } from "@/lib/three/textures";
import { useWorld } from "@/state/world";
import { bridge, islet, isletHeight } from "../locations";
import { createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";
import { applyWind } from "../materials/wind";

/** Small floating islet: grassy top and a short rocky underside. */
function buildIslet() {
  const rings = 18,
    segs = 64,
    R = islet.radius;
  const top: number[] = [];
  const tc: number[] = [];
  for (let i = 0; i <= rings + 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const rr = R * (1 + 0.07 * Math.sin(a * 3 + 1) + 0.04 * noise2(Math.cos(a), Math.sin(a)));
      let r = (i / rings) * rr;
      let y: number;
      if (i <= rings) {
        y = isletHeight(islet.center[0] + Math.cos(a) * r, islet.center[2] + Math.sin(a) * r) - islet.center[1];
      } else {
        r = rr * 1.01;
        y = isletHeight(islet.center[0] + Math.cos(a) * rr, islet.center[2] + Math.sin(a) * rr) - islet.center[1] - 0.3;
      }
      top.push(Math.cos(a) * r, y, Math.sin(a) * r);
      const n = noise2(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      const edge = i > rings ? 1 : smoothstep(0.85, 1, i / rings);
      tc.push(
        srgbToLinear(lerp(0.42 + n * 0.08, 0.3, edge)),
        srgbToLinear(lerp(0.53 + n * 0.08, 0.22, edge)),
        srgbToLinear(lerp(0.26, 0.14, edge)),
      );
    }
  }
  const idx: number[] = [];
  for (let i = 0; i <= rings; i++)
    for (let j = 0; j < segs; j++) {
      const a = i * segs + j,
        b = i * segs + ((j + 1) % segs),
        c = (i + 1) * segs + j,
        d = (i + 1) * segs + ((j + 1) % segs);
      idx.push(a, b, c, b, d, c);
    }
  const topGeo = new BufferGeometry();
  topGeo.setAttribute("position", new BufferAttribute(new Float32Array(top), 3));
  topGeo.setAttribute("color", new BufferAttribute(new Float32Array(tc), 3));
  topGeo.setIndex(idx);
  topGeo.computeVertexNormals();

  // Underside (flat-shaded rock).
  const urings = 10;
  const grid: [number, number, number][][] = [];
  for (let i = 0; i <= urings; i++) {
    const s = i / urings;
    const row: [number, number, number][] = [];
    for (let j = 0; j < 40; j++) {
      const a = ((j + 0.5 * (i % 2)) / 40) * Math.PI * 2;
      const rr = R * (1 + 0.07 * Math.sin(a * 3 + 1) + 0.04 * noise2(Math.cos(a), Math.sin(a)));
      const edgeY = isletHeight(islet.center[0] + Math.cos(a) * rr, islet.center[2] + Math.sin(a) * rr) - islet.center[1] - 0.3;
      let r = rr * (1 - Math.pow(s, 1.4));
      r += (1 - Math.abs(noise3(Math.cos(a) * 3, s * 2, Math.sin(a) * 3))) * 0.25 * s;
      if (i === urings) r = 0;
      const y = lerp(edgeY, -3.2, Math.pow(s, 0.9)) + (i > 0 && i < urings ? noise2(j, i) * 0.08 : 0);
      row.push([Math.cos(a) * r, y, Math.sin(a) * r]);
    }
    grid.push(row);
  }
  const pos: number[] = [];
  const col: number[] = [];
  const rand = mulberry32(9);
  const strata = [new Color("#8E7A63"), new Color("#A08D74"), new Color("#7B6A58")];
  const tmp = new Color();
  for (let i = 0; i < urings; i++)
    for (let j = 0; j < 40; j++) {
      const a = grid[i][j],
        b = grid[i][(j + 1) % 40],
        c = grid[i + 1][j],
        d = grid[i + 1][(j + 1) % 40];
      for (const tri of [
        [a, b, c],
        [b, d, c],
      ]) {
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
        tmp.copy(strata[Math.abs(Math.floor(cy * 1.4)) % 3]).lerp(new Color("#4A4048"), clamp(-cy / 3.2, 0, 1) * 0.6);
        if (cy > -0.6) tmp.lerp(new Color("#5A4330"), 0.6);
        const v = 0.95 + rand() * 0.08;
        tri.forEach((p) => {
          pos.push(...p);
          col.push(tmp.r * v, tmp.g * v, tmp.b * v);
        });
      }
    }
  const under = new BufferGeometry();
  under.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  under.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
  under.computeVertexNormals();
  return { topGeo, under };
}

function isletGrass(material: MeshStandardMaterial, count: number) {
  const rand = mulberry32(55);
  const blade = new BufferGeometry();
  blade.setAttribute(
    "position",
    new BufferAttribute(new Float32Array([-0.04, 0, 0, 0.04, 0, 0, -0.02, 0.5, 0.05, 0.02, 0.5, 0.05, 0, 1, 0.14]), 3),
  );
  blade.setAttribute("color", new BufferAttribute(new Float32Array([0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 1.25, 1.25, 1.2]), 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  blade.computeVertexNormals();
  const mesh = new InstancedMesh(blade, material, count);
  const m = new Matrix4();
  const q = new Quaternion();
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * islet.radius * 0.97;
    const x = islet.center[0] + Math.cos(a) * r;
    const z = islet.center[2] + Math.sin(a) * r;
    q.setFromAxisAngle(new Vector3(0, 1, 0), rand() * 6.28);
    const h = 0.22 + rand() * 0.18;
    m.compose(new Vector3(x, isletHeight(x, z) - 0.01, z), q, new Vector3(1, h, 1));
    mesh.setMatrixAt(i, m);
    const n = noise2(x * 0.7, z * 0.7);
    colors.set([srgbToLinear(0.46 + n * 0.08), srgbToLinear(0.58 + n * 0.06), srgbToLinear(0.29)], i * 3);
  }
  mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
  mesh.frustumCulled = false;
  return mesh;
}

/** Sagging plank bridge with rope rails between the island and the islet. */
function Bridge({ shadows }: { shadows: boolean }) {
  const data = useMemo(() => {
    const a = new Vector3(...bridge.from);
    const b = new Vector3(...bridge.to);
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 0.45;
    const curve = new CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).add(new Vector3(0, -0.22, 0)), mid, b.clone().lerp(mid, 0.5).add(new Vector3(0, -0.22, 0)), b]);
    const len = curve.getLength();
    const n = Math.round(len / 0.19);
    const dir = b.clone().sub(a).setY(0).normalize();
    const side = new Vector3(-dir.z, 0, dir.x);
    const t = woodTextures({ planks: 1, base: [146, 108, 74], seed: 41 });
    const plankMat = new MeshStandardMaterial({ map: t.map, roughness: 0.9 });
    const plank = new InstancedMesh(new BoxGeometry(0.72, 0.04, 0.14), plankMat, n);
    const rand = mulberry32(12);
    const o = new Object3D();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const p = curve.getPointAt(u);
      const tan = curve.getTangentAt(u);
      o.position.copy(p);
      o.lookAt(p.clone().add(tan));
      o.rotateY(Math.PI / 2);
      o.rotateX((rand() - 0.5) * 0.06);
      o.rotateY((rand() - 0.5) * 0.06);
      o.updateMatrix();
      plank.setMatrixAt(i, o.matrix);
    }
    // Rope rails: same sag, a little higher, on both sides.
    const rails = [1, -1].map((s) => {
      const pts = curve.getPoints(24).map((p, i, arr) => {
        const k = Math.sin((i / (arr.length - 1)) * Math.PI);
        return p.clone().addScaledVector(side, 0.38 * s).add(new Vector3(0, 0.55 - k * 0.12, 0));
      });
      return new TubeGeometry(new CatmullRomCurve3(pts), 40, 0.018, 5, false);
    });
    const posts = [a, b].flatMap((e) => [1, -1].map((s) => e.clone().addScaledVector(side, 0.38 * s)));
    return { plank, plankMat, rails, posts, tex: t };
  }, []);

  useEffect(() => {
    data.plank.castShadow = shadows;
    data.plank.receiveShadow = shadows;
  }, [data, shadows]);
  useEffect(
    () => () => {
      data.plank.geometry.dispose();
      data.plankMat.dispose();
      data.rails.forEach((r) => r.dispose());
      data.tex.map.dispose();
      data.tex.bumpMap.dispose();
    },
    [data],
  );

  return (
    <group>
      <primitive object={data.plank} />
      {data.rails.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#C9B48E" roughness={1} />
        </mesh>
      ))}
      {data.posts.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + 0.25, p.z]} castShadow={shadows}>
          <cylinderGeometry args={[0.045, 0.055, 0.7, 8]} />
          <meshStandardMaterial color="#5B412E" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** A smooth stone with a carved message that glows when touched. */
function MessageStone() {
  const [x, z] = islet.stone;
  const y = isletHeight(x, z);
  const glow = useMemo(() => createGlowMaterial("#FFE2B0", 0), []);
  const mat = useMemo(() => new MeshStandardMaterial({ color: "#B3A796", roughness: 0.6, emissive: new Color("#FFD9A0"), emissiveIntensity: 0 }), []);
  const lit = useRef(0);
  const onTap = useCallback(() => {
    const st = useWorld.getState();
    st.touch("message-stone");
    st.showMessage("You're allowed to rest.");
    lit.current = 1;
  }, []);
  const { hovered, bind } = useInteractive(onTap, true, ["explore", "lookout"]);
  useFrame((_, dt) => {
    const t = shared.uTime.value;
    lit.current = Math.max(0, lit.current - dt * 0.12);
    const invite = 0.15 + 0.12 * Math.sin(t * 1.4);
    mat.emissiveIntensity = lit.current * 0.6 + (hovered ? 0.15 : 0);
    glow.uniforms.uOpacity.value = invite + lit.current * 0.6 + (hovered ? 0.25 : 0);
  });
  useEffect(
    () => () => {
      glow.dispose();
      mat.dispose();
    },
    [glow, mat],
  );
  return (
    <group position={[x, y, z]} {...bind}>
      <mesh material={mat} scale={[0.32, 0.16, 0.24]} position={[0, 0.06, 0]} rotation={[0, 0.6, 0.08]} castShadow>
        <icosahedronGeometry args={[1, 2]} />
      </mesh>
      <mesh position={[0, 0.3, 0]} material={glow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={6}>
        <planeGeometry args={[0.9, 0.9]} />
      </mesh>
      <mesh visible={false} position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.42, 8, 6]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

function Bench({ shadows }: { shadows: boolean }) {
  const [x, z] = islet.bench;
  const y = isletHeight(x, z);
  return (
    <group position={[x, y, z]} rotation={[0, islet.benchYaw, 0]}>
      {[0.0, 0.11, 0.22].map((dz) => (
        <mesh key={dz} position={[0, 0.42, dz - 0.11]} castShadow={shadows}>
          <boxGeometry args={[1.0, 0.04, 0.1]} />
          <meshStandardMaterial color="#8A6A48" roughness={0.9} />
        </mesh>
      ))}
      {[0.12, 0.26].map((h) => (
        <mesh key={h} position={[0, 0.5 + h, -0.18]} rotation={[0.18, 0, 0]} castShadow={shadows}>
          <boxGeometry args={[1.0, 0.07, 0.03]} />
          <meshStandardMaterial color="#8A6A48" roughness={0.9} />
        </mesh>
      ))}
      {[-0.42, 0.42].map((sx) => (
        <group key={sx} position={[sx, 0, 0]}>
          <mesh position={[0, 0.21, 0.08]}>
            <boxGeometry args={[0.05, 0.42, 0.05]} />
            <meshStandardMaterial color="#5B412E" />
          </mesh>
          <mesh position={[0, 0.35, -0.17]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.05, 0.72, 0.05]} />
            <meshStandardMaterial color="#5B412E" />
          </mesh>
        </group>
      ))}
      {/* A knitted blanket draped over one end */}
      <mesh position={[0.3, 0.46, 0.0]} rotation={[0, 0.2, 0]} castShadow={shadows}>
        <boxGeometry args={[0.3, 0.04, 0.34]} />
        <meshStandardMaterial color="#B7A9CC" roughness={1} side={DoubleSide} />
      </mesh>
    </group>
  );
}

/** Scene 07 — a small islet to sit and watch the sky, reached by a rope bridge. */
export function Lookout({ shadows, grass }: { shadows: boolean; grass: number }) {
  const geo = useMemo(buildIslet, []);
  const topMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  const rockMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, flatShading: true }), []);
  const grassMat = useMemo(
    () =>
      applyWind(new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: DoubleSide }), {
        bendPow: 1.6,
        bendAmp: 0.85,
        flutter: 0.12,
        translucency: 0.75,
        translucencyHeight: 0.4,
        upNormal: 0.72,
        touch: 3.4,
      }),
    [],
  );
  const grassMesh = useMemo(() => isletGrass(grassMat, grass), [grassMat, grass]);
  useEffect(() => {
    grassMesh.receiveShadow = shadows;
  }, [grassMesh, shadows]);
  useEffect(() => () => grassMesh.dispose(), [grassMesh]);
  useEffect(
    () => () => {
      geo.topGeo.dispose();
      geo.under.dispose();
      topMat.dispose();
      rockMat.dispose();
      grassMat.dispose();
    },
    [geo, topMat, rockMat, grassMat],
  );

  return (
    <group>
      <group position={islet.center}>
        <mesh geometry={geo.topGeo} material={topMat} receiveShadow={shadows} />
        <mesh geometry={geo.under} material={rockMat} />
      </group>
      <primitive object={grassMesh} />
      <Bridge shadows={shadows} />
      <Bench shadows={shadows} />
      <MessageStone />
    </group>
  );
}
