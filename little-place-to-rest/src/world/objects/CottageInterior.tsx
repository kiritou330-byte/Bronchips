"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  type PointLight,
  BoxGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mulberry32 } from "@/lib/three/noise";
import { woodTextures } from "@/lib/three/textures";
import { useNavigation } from "@/state/navigation";
import { createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";
import { COTTAGE } from "./cottageDims";
import { Envelope } from "./Envelope";

const { W, D, H, rise, T } = COTTAGE;
const IW = W - T * 2;
const ID = D - T * 2;

function rugTexture() {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  // Braided rag rug: many thin coils in close, low-contrast tones.
  const tones = ["#CDBB9E", "#C2AF92", "#D7C7AB", "#B9A68A", "#C9B5A8", "#BFB39A"];
  for (let r = s / 2 - 2, i = 0; r > 2; r -= 4, i++) {
    ctx.strokeStyle = tones[(i * 7) % tones.length];
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A soft sage border and a lavender band for a touch of colour.
  ctx.strokeStyle = "#93A88A";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(183,169,204,0.7)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 46, 0, Math.PI * 2);
  ctx.stroke();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function Bookshelf({ shadows }: { shadows: boolean }) {
  const books = useMemo(() => {
    const rand = mulberry32(88);
    const geo = new BoxGeometry(1, 1, 1);
    const mat = new MeshStandardMaterial({ roughness: 0.75 });
    const cols = ["#8E5A4A", "#5E7183", "#7E9A6E", "#C9A86A", "#B7A9CC", "#6B4E37", "#E2D3B5", "#9A6B78"].map((c) => new Color(c));
    const list: Matrix4[] = [];
    const colors: number[] = [];
    [0.08, 0.42, 0.76].forEach((shelfY) => {
      let x = -0.26;
      while (x < 0.25) {
        const w = 0.03 + rand() * 0.025;
        const h = 0.18 + rand() * 0.1;
        const lean = x > 0.18 ? -0.25 : 0;
        list.push(
          new Matrix4().compose(
            new Vector3(x + w / 2, shelfY + h / 2 + 0.01, 0),
            new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), lean),
            new Vector3(w, h, 0.16 + rand() * 0.03),
          ),
        );
        const c = cols[Math.floor(rand() * cols.length)];
        colors.push(c.r, c.g, c.b);
        x += w + 0.004;
      }
    });
    const mesh = new InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(colors), 3);
    return { mesh, geo, mat };
  }, []);
  useEffect(() => {
    books.mesh.castShadow = shadows;
    return () => {
      books.geo.dispose();
      books.mat.dispose();
      books.mesh.dispose();
    };
  }, [books, shadows]);
  return (
    <group>
      {/* frame */}
      {[-0.29, 0.29].map((x) => (
        <mesh key={x} position={[x, 0.55, 0]}>
          <boxGeometry args={[0.03, 1.1, 0.22]} />
          <meshStandardMaterial color="#6B4E37" roughness={0.85} />
        </mesh>
      ))}
      {[0.06, 0.4, 0.74, 1.08].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <boxGeometry args={[0.6, 0.025, 0.22]} />
          <meshStandardMaterial color="#7A5A3E" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.55, -0.1]}>
        <boxGeometry args={[0.58, 1.1, 0.01]} />
        <meshStandardMaterial color="#5A3F2C" roughness={0.9} />
      </mesh>
      <primitive object={books.mesh} />
      {/* a little plant on top */}
      <mesh position={[0.12, 1.15, 0]}>
        <cylinderGeometry args={[0.05, 0.04, 0.08, 10]} />
        <meshStandardMaterial color="#B87452" />
      </mesh>
      <mesh position={[0.12, 1.24, 0]}>
        <icosahedronGeometry args={[0.08, 1]} />
        <meshStandardMaterial color="#5E8A48" roughness={0.85} />
      </mesh>
    </group>
  );
}

function Armchair() {
  // Soft, upholstered shapes (rounded boxes) instead of raw cubes.
  const parts = useMemo(() => {
    const fabric = new MeshStandardMaterial({ color: "#9C8DB8", roughness: 0.95 });
    const cushion = new MeshStandardMaterial({ color: "#B7A9CC", roughness: 0.95 });
    const throwMat = new MeshStandardMaterial({ color: "#EBDDC3", roughness: 1 });
    const seat = new RoundedBoxGeometry(0.52, 0.2, 0.48, 3, 0.06);
    const pillow = new RoundedBoxGeometry(0.42, 0.1, 0.4, 3, 0.045);
    const back = new RoundedBoxGeometry(0.52, 0.5, 0.13, 3, 0.06);
    const arm = new RoundedBoxGeometry(0.1, 0.2, 0.46, 3, 0.045);
    const throwGeo = new RoundedBoxGeometry(0.26, 0.03, 0.3, 2, 0.012);
    return { fabric, cushion, throwMat, seat, pillow, back, arm, throwGeo };
  }, []);
  useEffect(
    () => () => Object.values(parts).forEach((p) => p.dispose()),
    [parts],
  );
  return (
    <group>
      <mesh position={[0, 0.22, 0]} geometry={parts.seat} material={parts.fabric} castShadow />
      <mesh position={[0, 0.36, 0.02]} geometry={parts.pillow} material={parts.cushion} />
      <mesh position={[0, 0.52, -0.2]} rotation={[-0.15, 0, 0]} geometry={parts.back} material={parts.fabric} castShadow />
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} position={[x, 0.39, 0]} geometry={parts.arm} material={parts.fabric} />
      ))}
      <mesh position={[0.05, 0.42, 0.05]} rotation={[0, 0.3, 0.05]} geometry={parts.throwGeo} material={parts.throwMat} />
      {[-0.2, 0.2].flatMap((x) =>
        [-0.18, 0.18].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.06, z]}>
            <cylinderGeometry args={[0.02, 0.015, 0.12, 6]} />
            <meshStandardMaterial color="#5A3F2C" />
          </mesh>
        )),
      )}
    </group>
  );
}

export function CottageInterior({ shadows }: { shadows: boolean }) {
  const lamp = useRef<PointLight>(null);
  const fire = useRef<PointLight>(null);
  const phase = useNavigation((s) => s.phase);
  const inside = phase === "cottage" || phase === "letter";

  const mats = useMemo(() => {
    const floor = woodTextures({ planks: 7, base: [140, 98, 64], seed: 21 });
    floor.map.repeat.set(1.2, 1.2);
    floor.bumpMap.repeat.set(1.2, 1.2);
    const ceil = woodTextures({ planks: 8, base: [176, 136, 98], seed: 31 });
    return {
      floor: new MeshStandardMaterial({ map: floor.map, bumpMap: floor.bumpMap, bumpScale: 0.8, roughness: 0.7 }),
      ceiling: new MeshStandardMaterial({ map: ceil.map, roughness: 0.9, side: DoubleSide }),
      wood: new MeshStandardMaterial({ color: "#7A5A3E", roughness: 0.8 }),
      stove: new MeshStandardMaterial({ color: "#2E2A28", roughness: 0.6, metalness: 0.5 }),
      fire: new MeshStandardMaterial({ color: "#331A0C", emissive: new Color("#FF8A3C"), emissiveIntensity: 2 }),
      shade: new MeshStandardMaterial({ color: "#F3E3C2", emissive: new Color("#FFC98A"), emissiveIntensity: 0.8, side: DoubleSide }),
      rug: new MeshStandardMaterial({ map: rugTexture(), roughness: 1 }),
      tex: [floor.map, floor.bumpMap, ceil.map],
    };
  }, []);
  const fireGlow = useMemo(() => createGlowMaterial("#FF9A50", 0.6), []);

  useFrame(() => {
    const t = shared.uTime.value;
    const f = 0.85 + 0.15 * Math.sin(t * 8.3) * Math.sin(t * 3.7 + 0.6) + 0.05 * Math.sin(t * 17.1);
    mats.fire.emissiveIntensity = 1.6 + f * 1.2;
    fireGlow.uniforms.uOpacity.value = 0.35 + f * 0.3;
    // The room glows a little all the time (visible through the windows), more when you're inside.
    const boost = inside ? 1 : 0.55;
    if (lamp.current) lamp.current.intensity = (2.6 + shared.uWindowGlow.value * 1.2) * boost;
    if (fire.current) fire.current.intensity = 1.6 * f * boost;
  });

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => (Array.isArray(m) ? m.forEach((t) => t.dispose()) : m.dispose()));
      fireGlow.dispose();
    },
    [mats, fireGlow],
  );

  const theta = Math.atan2(rise, W / 2);
  const slope = Math.hypot(W / 2, rise);

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0.046, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.floor} receiveShadow={shadows}>
        <planeGeometry args={[IW, ID]} />
      </mesh>
      {/* Wooden ceiling under each roof slope */}
      {[1, -1].map((side) => (
        <group key={side} position={[(side * W) / 4, H + rise / 2 - 0.07, 0]} rotation={[0, 0, -side * theta]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={mats.ceiling}>
            <planeGeometry args={[slope, ID]} />
          </mesh>
        </group>
      ))}
      {/* Rug */}
      <mesh position={[-0.2, 0.05, -0.3]} rotation={[-Math.PI / 2, 0, 0]} material={mats.rug} receiveShadow={shadows}>
        <circleGeometry args={[0.62, 40]} />
      </mesh>

      {/* Table with lamp and the envelope */}
      <group position={[-0.25, 0.046, -0.55]}>
        <mesh position={[0, 0.46, 0]} material={mats.wood} castShadow={shadows} receiveShadow={shadows}>
          <cylinderGeometry args={[0.3, 0.3, 0.035, 28]} />
        </mesh>
        <mesh position={[0, 0.23, 0]} material={mats.wood}>
          <cylinderGeometry args={[0.035, 0.05, 0.44, 10]} />
        </mesh>
        <mesh position={[0, 0.015, 0]} material={mats.wood}>
          <cylinderGeometry args={[0.16, 0.18, 0.03, 16]} />
        </mesh>
        {/* lamp */}
        <group position={[-0.15, 0.48, -0.12]}>
          <mesh position={[0, 0.015, 0]} material={mats.wood}>
            <cylinderGeometry args={[0.05, 0.06, 0.03, 12]} />
          </mesh>
          <mesh position={[0, 0.13, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.22, 6]} />
            <meshStandardMaterial color="#C9A25A" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.25, 0]} material={mats.shade}>
            <cylinderGeometry args={[0.06, 0.1, 0.11, 18, 1, true]} />
          </mesh>
          <pointLight ref={lamp} position={[0, 0.22, 0]} color="#FFB66B" distance={4.5} decay={2} intensity={2} />
        </group>
        <group position={[0.03, 0.48, 0.05]} rotation={[0, 0.25, 0]}>
          <Envelope />
        </group>
        {/* a teacup */}
        <group position={[0.17, 0.48, -0.08]}>
          <mesh position={[0, 0.03, 0]}>
            <cylinderGeometry args={[0.03, 0.024, 0.05, 14]} />
            <meshStandardMaterial color="#F3EADA" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.003, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.006, 16]} />
            <meshStandardMaterial color="#F3EADA" roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* Armchair, angled towards the table */}
      <group position={[-0.78, 0.046, -0.3]} rotation={[0, 1.05, 0]}>
        <Armchair />
      </group>

      {/* Bookshelf against the left wall */}
      <group position={[-IW / 2 + 0.12, 0.046, 0.62]} rotation={[0, Math.PI / 2, 0]}>
        <Bookshelf shadows={shadows} />
      </group>

      {/* Little wood stove under the chimney */}
      <group position={[0.68, 0.046, -0.88]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.2, 0]} material={mats.stove} castShadow={shadows}>
          <boxGeometry args={[0.32, 0.34, 0.28]} />
        </mesh>
        <mesh position={[0, 0.2, 0.141]} material={mats.fire}>
          <planeGeometry args={[0.16, 0.12]} />
        </mesh>
        <mesh position={[0, 0.2 + 0.17 + 0.6, -0.04]} material={mats.stove}>
          <cylinderGeometry args={[0.04, 0.04, 1.2, 10]} />
        </mesh>
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.015, 0]} material={mats.stove}>
            <boxGeometry args={[0.04, 0.03, 0.26]} />
          </mesh>
        ))}
        <Billboard position={[0, 0.2, 0.2]}>
          <mesh material={fireGlow} renderOrder={6}>
            <planeGeometry args={[0.55, 0.55]} />
          </mesh>
        </Billboard>
        <pointLight ref={fire} position={[0, 0.22, 0.25]} color="#FF8A3C" distance={2.6} decay={2} intensity={1} />
      </group>

      {/* A framed picture on the back wall */}
      <group position={[0.1, 1.02, -ID / 2 + 0.012]}>
        <mesh>
          <boxGeometry args={[0.34, 0.26, 0.02]} />
          <meshStandardMaterial color="#6B4E37" />
        </mesh>
        <mesh position={[0, 0, 0.011]}>
          <planeGeometry args={[0.28, 0.2]} />
          <meshStandardMaterial color="#E9C9A6" emissive="#F7C99B" emissiveIntensity={0.08} />
        </mesh>
        <mesh position={[0.02, -0.02, 0.012]}>
          <circleGeometry args={[0.05, 16]} />
          <meshStandardMaterial color="#8FA886" />
        </mesh>
      </group>
    </group>
  );
}
