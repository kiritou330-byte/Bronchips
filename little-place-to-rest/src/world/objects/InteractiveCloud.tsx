"use client";

import { useFrame } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { InstancedBufferAttribute, InstancedMesh, Object3D, PlaneGeometry, Vector3 } from "three";
import { messages } from "@/config/messages.config";
import { useInteractive } from "@/hooks/useInteractive";
import { mulberry32 } from "@/lib/three/noise";
import { useWorld } from "@/state/world";
import { createCloudMaterial, puffTexture } from "../environment/CloudSystem";
import { live, shared } from "../materials/shared";

const HOME = new Vector3(10.2, 5.2, 1.2);
const WIND = new Vector3(1, 0.08, 0.42).normalize();
const tmp = new Object3D();

let messageIndex = 0;

/** A small cloud close to the island. Touch it and it drifts away for a while — then returns. */
export function InteractiveCloud() {
  const texture = useMemo(() => puffTexture(), []);
  const material = useMemo(() => createCloudMaterial(texture), [texture]);
  const offset = useRef(new Vector3());
  const hoverAmt = useRef(0);
  const drifting = useRef(false);

  const puffs = useMemo(() => {
    const rand = mulberry32(404);
    return Array.from({ length: 9 }, () => {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand());
      return {
        local: new Vector3(Math.cos(a) * r * 1.5, (1 - r * r) * 0.7 * (0.4 + rand() * 0.6), Math.sin(a) * r * 0.8),
        size: 1.25 + rand() * 0.6,
        rot: rand() * 6,
        phase: rand() * 10,
      };
    });
  }, []);

  const mesh = useMemo(() => {
    const geo = new PlaneGeometry(1, 1);
    const m = new InstancedMesh(geo, material, puffs.length);
    geo.setAttribute("aCenter", new InstancedBufferAttribute(new Float32Array(puffs.length * 3), 3));
    const params = new Float32Array(puffs.length * 4);
    puffs.forEach((p, i) => params.set([p.size, p.rot, p.phase, 0.95], i * 4));
    geo.setAttribute("aParams", new InstancedBufferAttribute(params, 4));
    m.frustumCulled = false;
    m.renderOrder = 3;
    return m;
  }, [material, puffs]);

  const onTap = useCallback(() => {
    if (drifting.current) return;
    drifting.current = true;
    const st = useWorld.getState();
    st.showMessage(messages.clouds[messageIndex++ % messages.clouds.length]);
    const o = offset.current;
    const reduced = st.reducedMotion;
    gsap
      .timeline({ onComplete: () => (drifting.current = false) })
      .to(o, { x: WIND.x * 6, y: WIND.y * 6, z: WIND.z * 6, duration: reduced ? 2 : 7, ease: "sine.inOut" })
      .to(o, { x: 0, y: 0, z: 0, duration: reduced ? 3 : 14, ease: "sine.inOut" }, "+=16");
  }, []);

  const { hovered, active, bind } = useInteractive(onTap);
  const hit = useRef<Object3D>(null);

  useFrame((_, dt) => {
    const t = shared.uTime.value;
    hoverAmt.current += ((hovered ? 1 : 0) - hoverAmt.current) * Math.min(1, dt * 6);
    // A slow bob so it feels like it's floating, not pinned.
    const base = HOME.clone().add(offset.current);
    base.y += Math.sin(t * 0.35) * 0.15;
    const centers = mesh.geometry.getAttribute("aCenter") as InstancedBufferAttribute;
    puffs.forEach((p, i) => {
      tmp.position.copy(base).add(p.local);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      centers.setXYZ(i, base.x, base.y + 0.2, base.z);
    });
    mesh.instanceMatrix.needsUpdate = true;
    centers.needsUpdate = true;
    if (hit.current) hit.current.position.copy(base).add(new Vector3(0, 0.3, 0));
    material.uniforms.uFogColor.value.copy(live.fogColor);
    material.uniforms.uFogDensity.value = live.fogDensity;
    // Breathing shimmer = "you can touch me"; brighter on hover; off while drifting.
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6);
    const invite = active && !drifting.current ? 0.35 + pulse * 0.35 : 0;
    material.uniforms.uGlow.value = invite + hoverAmt.current * 0.6;
  });

  useEffect(
    () => () => {
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    [mesh, material, texture],
  );

  return (
    <>
      <primitive object={mesh} />
      <mesh ref={hit} visible={false} {...bind}>
        <sphereGeometry args={[1.7, 10, 8]} />
        <meshBasicMaterial />
      </mesh>
    </>
  );
}
