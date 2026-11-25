"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { useInteractive } from "@/hooks/useInteractive";
import { useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";
import { openLetter } from "../director";
import { createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";

const EW = 0.2; // width (x)
const ED = 0.13; // depth (z)

/** Hand-written-looking lines on the folded paper (just texture, the real letter is DOM). */
function paperTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 320;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#FBF5E8";
  ctx.fillRect(0, 0, 256, 320);
  ctx.strokeStyle = "rgba(92,70,60,0.55)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 11; i++) {
    const y = 44 + i * 24;
    ctx.beginPath();
    ctx.moveTo(28, y);
    let x = 28;
    const end = i === 0 ? 120 : i === 10 ? 150 : 200 + Math.sin(i * 3.1) * 25;
    while (x < end) {
      x += 6;
      ctx.lineTo(x, y + Math.sin(x * 0.35 + i) * 1.6);
    }
    ctx.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Triangular flap hinged on the back edge (local z = 0), folding forward over the envelope. */
function flapGeometry() {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute([-EW / 2, 0, 0, EW / 2, 0, 0, 0, 0, ED * 0.62], 3));
  g.setIndex([0, 2, 1]);
  g.computeVertexNormals();
  return g;
}

/**
 * Scene 05 — the envelope on the table. Softly glowing until opened; tap to read.
 * Opening: the wax seal lifts, the flap folds back, the letter slides out.
 */
export function Envelope() {
  const flap = useRef<Group>(null);
  const paper = useRef<Group>(null);
  const seal = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const opened = useWorld((s) => !!s.touched["letter"]);
  const phase = useNavigation((s) => s.phase);

  const paperTex = useMemo(paperTexture, []);
  const mats = useMemo(
    () => ({
      env: new MeshStandardMaterial({ color: "#EADBC0", roughness: 0.85, side: DoubleSide }),
      flap: new MeshStandardMaterial({ color: "#E3D2B3", roughness: 0.85, side: DoubleSide }),
      paper: new MeshStandardMaterial({ map: paperTex, roughness: 0.9, side: DoubleSide }),
      seal: new MeshStandardMaterial({ color: "#A6514A", roughness: 0.5 }),
    }),
    [paperTex],
  );
  const flapGeo = useMemo(flapGeometry, []);
  const glowMat = useMemo(() => createGlowMaterial("#FFD9A0", 0.5), []);

  // Reflect the opened state without animation on remount.
  useEffect(() => {
    if (!opened) return;
    if (flap.current) flap.current.rotation.x = -2.6;
    if (seal.current) seal.current.scale.setScalar(0.001);
    if (paper.current) paper.current.position.set(0, 0.02, -0.07);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateOpen = useCallback(() => {
    const reduced = useWorld.getState().reducedMotion;
    const k = reduced ? 0.35 : 1;
    const tl = gsap.timeline();
    if (seal.current) tl.to(seal.current.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.45 * k, ease: "back.in(2)" });
    if (flap.current) tl.to(flap.current.rotation, { x: -2.6, duration: 1.1 * k, ease: "power2.inOut" }, "-=0.1");
    if (paper.current)
      tl.to(paper.current.position, { y: 0.02, z: -0.07, duration: 1.2 * k, ease: "power2.out" }, "-=0.35").to(
        paper.current.rotation,
        { x: -0.35, duration: 0.9 * k, ease: "sine.inOut" },
        "<",
      );
    return tl;
  }, []);

  const onTap = useCallback(() => {
    const first = !useWorld.getState().touched["letter"];
    useWorld.getState().touch("letter");
    openLetter(first ? animateOpen : undefined);
  }, [animateOpen]);

  const { hovered, bind } = useInteractive(onTap, true, ["cottage"]);

  useFrame(() => {
    if (!glow.current) return;
    const t = shared.uTime.value;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.0);
    const show = phase === "cottage" ? 1 : phase === "explore" ? 0.25 : 0;
    glowMat.uniforms.uOpacity.value = (opened ? 0.15 : 0.35 + pulse * 0.4 + (hovered ? 0.3 : 0)) * show;
  });

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
      paperTex.dispose();
      flapGeo.dispose();
      glowMat.dispose();
    },
    [mats, paperTex, flapGeo, glowMat],
  );

  return (
    <group {...bind}>
      {/* body */}
      <mesh position={[0, 0.004, 0]} material={mats.env} castShadow>
        <boxGeometry args={[EW, 0.006, ED]} />
      </mesh>
      {/* folded letter tucked inside */}
      <group ref={paper} position={[0, 0.006, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={mats.paper}>
          <planeGeometry args={[EW * 0.88, ED * 0.92]} />
        </mesh>
      </group>
      {/* flap, hinged on the back edge */}
      <group ref={flap} position={[0, 0.0075, -ED / 2]}>
        <mesh geometry={flapGeo} material={mats.flap} />
      </group>
      {/* wax seal */}
      <mesh ref={seal} position={[0, 0.012, 0.012]}>
        <cylinderGeometry args={[0.016, 0.016, 0.006, 16]} />
        <primitive object={mats.seal} attach="material" />
      </mesh>
      <Billboard position={[0, 0.05, 0]}>
        <mesh ref={glow} material={glowMat} renderOrder={6}>
          <planeGeometry args={[0.6, 0.6]} />
        </mesh>
      </Billboard>
      {/* Easy-to-hit invisible area */}
      <mesh position={[0, 0.03, 0]} visible={false}>
        <boxGeometry args={[0.34, 0.12, 0.26]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}
