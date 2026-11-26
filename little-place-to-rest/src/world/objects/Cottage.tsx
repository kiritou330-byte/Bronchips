"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type Group,
  BoxGeometry,
  type BufferGeometry,
  Color,
  ExtrudeGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  type Mesh,
  MeshStandardMaterial,
  Path,
  type PointLight,
  Quaternion,
  Shape,
  Vector3,
  Euler,
  IcosahedronGeometry,
  BufferAttribute,
} from "three";
import { layout } from "@/config/world.config";
import { mulberry32, noise3 } from "@/lib/three/noise";
import { islandHeight } from "@/lib/three/terrain";
import { woodTextures } from "@/lib/three/textures";
import { useInteractive } from "@/hooks/useInteractive";
import { useNavigation } from "@/state/navigation";
import { goTo } from "../director";
import { createGlowMaterial } from "../materials/glow";
import { CottageInterior } from "./CottageInterior";
import { COTTAGE } from "./cottageDims";
import { shared } from "../materials/shared";

// Cottage dimensions (local space: origin = floor centre, front door faces +Z).
/** Lets the director swing the door without React state. */
export const cottageDoor = {
  group: null as Group | null,
  swing(open: boolean, duration = 1.3) {
    if (!this.group) return Promise.resolve();
    return new Promise<void>((resolve) => {
      gsap.to(this.group!.rotation, {
        y: open ? 1.45 : 0,
        duration,
        ease: open ? "power2.inOut" : "power2.inOut",
        onComplete: resolve,
      });
    });
  },
};

export { COTTAGE };

const { W, D, H, rise, T } = COTTAGE;

function gableShape(withDoor: boolean, withRound: boolean) {
  const s = new Shape();
  s.moveTo(-W / 2, 0);
  s.lineTo(W / 2, 0);
  s.lineTo(W / 2, H);
  s.lineTo(0, H + rise);
  s.lineTo(-W / 2, H);
  s.closePath();
  if (withDoor) {
    const { w, h } = COTTAGE.door;
    const r = w / 2;
    const hole = new Path();
    hole.moveTo(-r, 0.02);
    hole.lineTo(r, 0.02);
    hole.lineTo(r, h - r);
    hole.absarc(0, h - r, r, 0, Math.PI, false);
    hole.lineTo(-r, 0.02);
    s.holes.push(hole);
  }
  if (withRound) {
    const hole = new Path();
    hole.absarc(0, H + 0.42, 0.17, 0, Math.PI * 2, true);
    s.holes.push(hole);
  }
  return s;
}

function sideShape(window: boolean) {
  const s = new Shape();
  const d = D - T * 2;
  s.moveTo(-d / 2, 0);
  s.lineTo(d / 2, 0);
  s.lineTo(d / 2, H);
  s.lineTo(-d / 2, H);
  s.closePath();
  if (window) {
    const hole = new Path();
    hole.moveTo(-0.28, 0.62);
    hole.lineTo(0.28, 0.62);
    hole.lineTo(0.28, 1.14);
    hole.lineTo(-0.28, 1.14);
    hole.closePath();
    s.holes.push(hole);
  }
  return s;
}

function extrude(shape: Shape, depth: number) {
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
}

/** Overlapping roof shingles on one slope (local frame: x down-slope, z along the ridge). */
function shingleMesh(length: number, depth: number, seed: number, material: MeshStandardMaterial) {
  const sw = 0.24,
    sl = 0.22;
  const rows = Math.ceil(length / (sl * 0.62));
  const cols = Math.ceil(depth / (sw * 0.92));
  const geo = new BoxGeometry(sw * 0.96, 0.035, sl);
  const mesh = new InstancedMesh(geo, material, rows * cols);
  const rand = mulberry32(seed);
  const m = new Matrix4();
  const q = new Quaternion();
  const e = new Euler();
  const p = new Vector3();
  const s = new Vector3(1, 1, 1);
  const colors = new Float32Array(rows * cols * 3);
  const base = new Color("#6A7480");
  const warm = new Color("#8A7F78");
  const moss = new Color("#6E8156");
  const c = new Color();
  let k = 0;
  for (let r = 0; r < rows; r++) {
    for (let j = 0; j < cols; j++) {
      const x = r * sl * 0.62 + sl / 2 - 0.02;
      const z = -depth / 2 + (j + (r % 2) * 0.5) * sw * 0.92;
      if (z > depth / 2 - 0.02) {
        // keep the count stable: park extra instance inside the slab
        p.set(x, -0.05, 0);
      } else p.set(x, 0.055 + r * 0.0009, z);
      e.set((rand() - 0.5) * 0.06, (rand() - 0.5) * 0.08, 0.1 + (rand() - 0.5) * 0.05);
      q.setFromEuler(e);
      m.compose(p, q, s);
      mesh.setMatrixAt(k, m);
      const n = noise3(x * 2, z * 2, seed) * 0.5 + 0.5;
      c.copy(base).lerp(warm, rand() * 0.45);
      if (n > 0.66 && r > 1) c.lerp(moss, (n - 0.66) * 2.2);
      c.multiplyScalar(0.85 + rand() * 0.25);
      colors.set([c.r, c.g, c.b], k * 3);
      k++;
    }
  }
  mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
  return mesh;
}

/** Rounded stones around the base of the walls. */
function stoneRing(seed: number, material: MeshStandardMaterial) {
  const rand = mulberry32(seed);
  const base = new IcosahedronGeometry(1, 1);
  const pos = base.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      y = pos.getY(i),
      z = pos.getZ(i);
    const n = 1 + noise3(x * 1.7, y * 1.7, z * 1.7) * 0.18;
    pos.setXYZ(i, x * n, y * n, z * n);
  }
  base.computeVertexNormals();
  const placements: { p: Vector3; s: Vector3; r: number }[] = [];
  const perim = (len: number, fixed: number, axis: "x" | "z", sign: number) => {
    let t = -len / 2;
    while (t < len / 2) {
      const sz = 0.12 + rand() * 0.06;
      const pos = axis === "x" ? new Vector3(t + sz, 0.07, fixed * sign) : new Vector3(fixed * sign, 0.07, t + sz);
      // Leave a gap at the door.
      if (!(axis === "x" && sign > 0 && Math.abs(pos.x) < COTTAGE.door.w / 2 + 0.1)) {
        placements.push({ p: pos, s: new Vector3(sz, sz * (0.55 + rand() * 0.25), sz * 0.8), r: rand() * Math.PI });
      }
      t += sz * 1.7;
    }
  };
  // Keep the ring outside the inner wall faces so no stone pokes through the floor.
  perim(W + 0.3, D / 2 + 0.14, "x", 1);
  perim(W + 0.3, D / 2 + 0.14, "x", -1);
  perim(D + 0.1, W / 2 + 0.14, "z", 1);
  perim(D + 0.1, W / 2 + 0.14, "z", -1);
  const mesh = new InstancedMesh(base, material, placements.length);
  const m = new Matrix4();
  const q = new Quaternion();
  const colors = new Float32Array(placements.length * 3);
  const c = new Color();
  placements.forEach((pl, i) => {
    q.setFromAxisAngle(new Vector3(0, 1, 0), pl.r);
    m.compose(pl.p, q, pl.s);
    mesh.setMatrixAt(i, m);
    c.set("#9A8E80").multiplyScalar(0.8 + rand() * 0.35);
    colors.set([c.r, c.g, c.b], i * 3);
  });
  mesh.instanceColor = new InstancedBufferAttribute(colors, 3);
  return mesh;
}

function Window({ position, rotationY, glassMat, trimMat }: { position: [number, number, number]; rotationY: number; glassMat: MeshStandardMaterial; trimMat: MeshStandardMaterial }) {
  const w = 0.56,
    h = 0.52,
    f = 0.055;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0, -0.02]} material={glassMat}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* frame */}
      <mesh position={[0, h / 2 + f / 2, 0.02]} material={trimMat} castShadow>
        <boxGeometry args={[w + f * 2, f, 0.08]} />
      </mesh>
      <mesh position={[-w / 2 - f / 2, 0, 0.02]} material={trimMat}>
        <boxGeometry args={[f, h, 0.08]} />
      </mesh>
      <mesh position={[w / 2 + f / 2, 0, 0.02]} material={trimMat}>
        <boxGeometry args={[f, h, 0.08]} />
      </mesh>
      {/* muntins */}
      <mesh position={[0, 0, 0.0]} material={trimMat}>
        <boxGeometry args={[0.025, h, 0.03]} />
      </mesh>
      <mesh position={[0, 0.02, 0.0]} material={trimMat}>
        <boxGeometry args={[w, 0.025, 0.03]} />
      </mesh>
      {/* sill */}
      <mesh position={[0, -h / 2 - 0.03, 0.06]} material={trimMat} castShadow>
        <boxGeometry args={[w + 0.2, 0.05, 0.16]} />
      </mesh>
    </group>
  );
}

function FlowerBox({ position, rotationY, woodMat, seed }: { position: [number, number, number]; rotationY: number; woodMat: MeshStandardMaterial; seed: number }) {
  const blooms = useMemo(() => {
    const rand = mulberry32(seed);
    const cols = ["#F2B59C", "#F6EEDC", "#C2B1DE", "#F2D27C"];
    return Array.from({ length: 9 }, (_, i) => ({
      x: -0.26 + (i / 8) * 0.52 + (rand() - 0.5) * 0.04,
      y: 0.1 + rand() * 0.06,
      z: (rand() - 0.5) * 0.08,
      s: 0.035 + rand() * 0.02,
      c: cols[Math.floor(rand() * cols.length)],
    }));
  }, [seed]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh material={woodMat} castShadow>
        <boxGeometry args={[0.62, 0.13, 0.15]} />
      </mesh>
      <mesh position={[0, 0.08, 0]} scale={[1, 0.45, 0.45]}>
        <sphereGeometry args={[0.32, 12, 6]} />
        <meshStandardMaterial color="#4C7440" roughness={0.9} />
      </mesh>
      {blooms.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, b.z]}>
          <icosahedronGeometry args={[b.s, 1]} />
          <meshStandardMaterial color={b.c} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

export function Cottage({ shadows }: { shadows: boolean }) {
  const [cx, cz] = layout.cottage.position;
  const y = useMemo(() => islandHeight(cx, cz), [cx, cz]);
  const lanternLight = useRef<PointLight>(null);
  const windowLight = useRef<PointLight>(null);

  const mats = useMemo(() => {
    const wall = woodTextures({ planks: 6, base: [156, 112, 76], seed: 3 });
    wall.map.repeat.set(0.85, 0.85);
    wall.bumpMap.repeat.set(0.85, 0.85);
    const door = woodTextures({ planks: 5, base: [104, 128, 108], seed: 9 });
    door.map.rotation = Math.PI / 2;
    door.bumpMap.rotation = Math.PI / 2;
    door.map.repeat.set(1.6, 1.6);
    door.bumpMap.repeat.set(1.6, 1.6);
    return {
      wall: new MeshStandardMaterial({ map: wall.map, bumpMap: wall.bumpMap, bumpScale: 1.4, roughness: 0.88 }),
      beam: new MeshStandardMaterial({ color: "#5A3F2C", roughness: 0.9 }),
      trim: new MeshStandardMaterial({ color: "#EFE4CC", roughness: 0.7 }),
      roofBase: new MeshStandardMaterial({ color: "#3D4651", roughness: 0.95 }),
      shingle: new MeshStandardMaterial({ roughness: 0.82 }),
      stone: new MeshStandardMaterial({ roughness: 0.95 }),
      chimney: new MeshStandardMaterial({ color: "#8E8379", roughness: 0.95, flatShading: true }),
      door: new MeshStandardMaterial({ map: door.map, bumpMap: door.bumpMap, bumpScale: 1.2, roughness: 0.75 }),
      brass: new MeshStandardMaterial({ color: "#C9A25A", roughness: 0.35, metalness: 0.8 }),
      glass: new MeshStandardMaterial({
        color: "#D9E4EC",
        emissive: new Color("#FFB062"),
        emissiveIntensity: 0.2,
        roughness: 0.1,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
      lantern: new MeshStandardMaterial({ color: "#FFE2A8", emissive: new Color("#FFC36E"), emissiveIntensity: 1.5 }),
      textures: [wall.map, wall.bumpMap, door.map, door.bumpMap],
    };
  }, []);

  const geo = useMemo(() => {
    const front = extrude(gableShape(true, true), T);
    front.translate(0, 0, D / 2 - T);
    const back = extrude(gableShape(false, false), T);
    back.translate(0, 0, -D / 2);
    const left = extrude(sideShape(true), T);
    left.rotateY(-Math.PI / 2);
    left.translate(-W / 2 + T, 0, 0);
    const right = extrude(sideShape(true), T);
    right.rotateY(Math.PI / 2);
    right.translate(W / 2 - T, 0, 0);
    const doorShape = new Shape();
    const { w, h } = COTTAGE.door;
    const r = w / 2 - 0.01;
    doorShape.moveTo(0, 0.03);
    doorShape.lineTo(2 * r, 0.03);
    doorShape.lineTo(2 * r, h - r - 0.01);
    doorShape.absarc(r, h - r - 0.01, r, 0, Math.PI, false);
    doorShape.lineTo(0, 0.03);
    const door = extrude(doorShape, 0.05);
    return { walls: [front, back, left, right] as BufferGeometry[], door };
  }, []);

  const roof = useMemo(() => {
    const theta = Math.atan2(rise, W / 2);
    const over = 0.32;
    const L = (W / 2 + over) / Math.cos(theta);
    const depth = D + 0.5;
    const right = shingleMesh(L, depth, 1, mats.shingle);
    const left = shingleMesh(L, depth, 2, mats.shingle);
    return { theta, L, depth, right, left };
  }, [mats.shingle]);

  const stones = useMemo(() => stoneRing(4, mats.stone), [mats.stone]);

  useEffect(() => {
    [roof.right, roof.left, stones].forEach((m) => {
      m.castShadow = shadows;
      m.receiveShadow = shadows;
    });
  }, [roof, stones, shadows]);

  useEffect(
    () => () => {
      geo.walls.forEach((g) => g.dispose());
      geo.door.dispose();
      roof.right.dispose();
      roof.left.dispose();
      stones.dispose();
      Object.values(mats).forEach((m) => {
        if (Array.isArray(m)) m.forEach((t) => t.dispose());
        else m.dispose();
      });
    },
    [geo, roof, stones, mats],
  );

  const glowMat = useMemo(() => createGlowMaterial("#FFC170", 1), []);
  // The door is the way in: tap it from the garden.
  const onDoor = useCallback(() => goTo("cottage"), []);
  const { hovered: doorHover, bind: doorBind } = useInteractive(onDoor);
  const doorGlow = useMemo(() => createGlowMaterial("#FFD9A0", 0), []);
  const glow = useRef<Mesh>(null);

  useFrame(() => {
    const g = shared.uWindowGlow.value;
    const t = shared.uTime.value;
    const flicker = 0.92 + 0.08 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1.7);
    mats.glass.emissiveIntensity = 0.05 + g * 0.5;
    mats.lantern.emissiveIntensity = (0.6 + g * 2.2) * flicker;
    glowMat.uniforms.uOpacity.value = (0.15 + g * 0.85) * flicker;
    if (lanternLight.current) lanternLight.current.intensity = g * 2.2 * flicker;
    if (windowLight.current) windowLight.current.intensity = g * 1.4;
    // Gentle invitation at the door handle; brighter on hover.
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);
    const outside = useNavigation.getState().phase === "explore";
    doorGlow.uniforms.uOpacity.value = outside ? 0.25 + pulse * 0.3 + (doorHover ? 0.45 : 0) : 0;
    mats.door.emissive.setRGB(0.25, 0.18, 0.1).multiplyScalar(doorHover && outside ? 0.6 : 0);
  });

  const ridgeY = H + rise;

  return (
    <group position={[cx, y, cz]} rotation={[0, layout.cottage.rotationY, 0]}>
      {/* Floor slab / plinth */}
      <mesh position={[0, -0.06, 0]} receiveShadow={shadows} castShadow={shadows}>
        <boxGeometry args={[W + 0.14, 0.2, D + 0.14]} />
        <meshStandardMaterial color="#7D7268" roughness={0.95} />
      </mesh>
      <primitive object={stones} />

      {geo.walls.map((g, i) => (
        <mesh key={i} geometry={g} material={mats.wall} castShadow={shadows} receiveShadow={shadows} />
      ))}

      {/* Corner posts */}
      {[
        [-W / 2, D / 2],
        [W / 2, D / 2],
        [-W / 2, -D / 2],
        [W / 2, -D / 2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, H / 2, z]} material={mats.beam} castShadow={shadows}>
          <boxGeometry args={[0.15, H + 0.02, 0.15]} />
        </mesh>
      ))}
      {/* Top beams */}
      <mesh position={[0, H, D / 2 + 0.01]} material={mats.beam} castShadow={shadows}>
        <boxGeometry args={[W + 0.18, 0.1, 0.12]} />
      </mesh>
      <mesh position={[0, H, -D / 2 - 0.01]} material={mats.beam}>
        <boxGeometry args={[W + 0.18, 0.1, 0.12]} />
      </mesh>

      {/* Roof: base slabs + shingles on each slope */}
      {[1, -1].map((side) => (
        <group key={side} position={[0, ridgeY + 0.02, 0]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
          <group rotation={[0, 0, -roof.theta]}>
            <mesh position={[roof.L / 2, 0, 0]} material={mats.roofBase} castShadow={shadows} receiveShadow={shadows}>
              <boxGeometry args={[roof.L, 0.07, roof.depth]} />
            </mesh>
            <primitive object={side > 0 ? roof.right : roof.left} />
            {/* Fascia board along the eave */}
            <mesh position={[roof.L, -0.02, 0]} material={mats.beam}>
              <boxGeometry args={[0.05, 0.12, roof.depth]} />
            </mesh>
          </group>
        </group>
      ))}
      {/* Ridge cap */}
      <mesh position={[0, ridgeY + 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.beam} castShadow={shadows}>
        <cylinderGeometry args={[0.07, 0.07, roof.depth + 0.04, 10]} />
      </mesh>
      {/* Bargeboards on the front gable */}
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[
            (side * (W / 2 + 0.32)) / 2,
            ridgeY - ((W / 2 + 0.32) / 2) * Math.tan(roof.theta) + 0.05,
            roof.depth / 2 + 0.01,
          ]}
          rotation={[0, 0, -side * roof.theta]}
          material={mats.trim}
          castShadow={shadows}
        >
          <boxGeometry args={[roof.L + 0.06, 0.09, 0.05]} />
        </mesh>
      ))}

      {/* Chimney */}
      <group position={[0.62, 0, -0.55]}>
        <mesh position={[0, ridgeY - 0.1, 0]} material={mats.chimney} castShadow={shadows}>
          <boxGeometry args={[0.38, 1.25, 0.38]} />
        </mesh>
        <mesh position={[0, ridgeY + 0.55, 0]} material={mats.beam} castShadow={shadows}>
          <boxGeometry args={[0.46, 0.08, 0.46]} />
        </mesh>
      </group>

      {/* Door (pivot on the left edge, swings inwards) */}
      <group
        ref={(g) => {
          cottageDoor.group = g;
        }}
        position={[-COTTAGE.door.w / 2 + 0.01, 0, D / 2 - T * 0.55]}
      >
        <mesh geometry={geo.door} material={mats.door} castShadow={shadows} {...doorBind} />
        <mesh position={[COTTAGE.door.w - 0.12, 0.55, 0.07]} material={mats.brass}>
          <sphereGeometry args={[0.032, 12, 8]} />
        </mesh>
        {[0.25, 0.85].map((hy) => (
          <mesh key={hy} position={[0.12, hy, 0.055]} material={mats.beam}>
            <boxGeometry args={[0.22, 0.04, 0.015]} />
          </mesh>
        ))}
      </group>
      <Billboard position={[COTTAGE.door.w / 2 - 0.1, 0.58, D / 2 + 0.12]}>
        <mesh material={doorGlow} renderOrder={6}>
          <planeGeometry args={[0.55, 0.55]} />
        </mesh>
      </Billboard>
      <CottageInterior shadows={shadows} />
      {/* Door frame */}
      <mesh position={[0, COTTAGE.door.h - COTTAGE.door.w / 2, D / 2 + 0.02]} material={mats.trim}>
        <torusGeometry args={[COTTAGE.door.w / 2 + 0.02, 0.035, 6, 18, Math.PI]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (COTTAGE.door.w / 2 + 0.02), (COTTAGE.door.h - 0.31) / 2, D / 2 + 0.02]} material={mats.trim}>
          <boxGeometry args={[0.07, COTTAGE.door.h - 0.31, 0.06]} />
        </mesh>
      ))}

      {/* Round gable window */}
      <group position={[0, H + 0.42, D / 2 - 0.03]}>
        <mesh material={mats.glass}>
          <circleGeometry args={[0.17, 20]} />
        </mesh>
        <mesh position={[0, 0, 0.05]} material={mats.trim}>
          <torusGeometry args={[0.18, 0.035, 8, 24]} />
        </mesh>
        <mesh position={[0, 0, 0.04]} material={mats.trim}>
          <boxGeometry args={[0.025, 0.34, 0.02]} />
        </mesh>
      </group>

      {/* Side windows + flower boxes */}
      <Window position={[W / 2 + 0.03, 0.88, 0]} rotationY={Math.PI / 2} glassMat={mats.glass} trimMat={mats.trim} />
      <Window position={[-W / 2 - 0.03, 0.88, 0]} rotationY={-Math.PI / 2} glassMat={mats.glass} trimMat={mats.trim} />
      <FlowerBox position={[W / 2 + 0.12, 0.52, 0]} rotationY={Math.PI / 2} woodMat={mats.beam} seed={3} />
      <FlowerBox position={[-W / 2 - 0.12, 0.52, 0]} rotationY={-Math.PI / 2} woodMat={mats.beam} seed={8} />
      <pointLight ref={windowLight} position={[W / 2 + 0.7, 0.9, 0]} color="#FFB062" distance={3} decay={2} intensity={0} />

      {/* Porch step + lantern */}
      <mesh position={[0, -0.02, D / 2 + 0.38]} receiveShadow={shadows} castShadow={shadows}>
        <boxGeometry args={[0.95, 0.12, 0.5]} />
        <meshStandardMaterial color="#9C9084" roughness={0.95} />
      </mesh>
      <group position={[COTTAGE.door.w / 2 + 0.3, 1.18, D / 2 + 0.1]}>
        <mesh position={[0, 0.12, -0.05]} material={mats.beam}>
          <boxGeometry args={[0.04, 0.04, 0.16]} />
        </mesh>
        <mesh material={mats.lantern}>
          <cylinderGeometry args={[0.06, 0.07, 0.15, 8]} />
        </mesh>
        <mesh position={[0, 0.1, 0]} material={mats.beam}>
          <coneGeometry args={[0.1, 0.08, 8]} />
        </mesh>
        <Billboard>
          <mesh ref={glow} material={glowMat} renderOrder={6}>
            <planeGeometry args={[1.1, 1.1]} />
          </mesh>
        </Billboard>
        <pointLight ref={lanternLight} position={[0, 0, 0.15]} color="#FFB869" distance={4.5} decay={2} intensity={0} />
      </group>

      {/* Little details: log pile and potted plants */}
      <group position={[-W / 2 - 0.35, 0, -0.7]} rotation={[0, Math.PI / 2, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const row = i < 3 ? 0 : 1;
          const col = row === 0 ? i : i - 3;
          return (
            <mesh key={i} position={[col * 0.17 - 0.17 + row * 0.085, 0.08 + row * 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={shadows}>
              <cylinderGeometry args={[0.08, 0.08, 0.62, 10]} />
              <meshStandardMaterial color={i % 2 ? "#7A5A3E" : "#8A6A48"} roughness={0.95} />
            </mesh>
          );
        })}
      </group>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.68, 0, D / 2 + 0.3]}>
          <mesh position={[0, 0.1, 0]} castShadow={shadows}>
            <cylinderGeometry args={[0.11, 0.08, 0.2, 12]} />
            <meshStandardMaterial color="#B87452" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.3, 0]} castShadow={shadows}>
            <icosahedronGeometry args={[0.16, 2]} />
            <meshStandardMaterial color="#557C42" roughness={0.85} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

