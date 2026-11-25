"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  type Group,
  MeshStandardMaterial,
  type PointLight,
  ShaderMaterial,
  Vector3,
} from "three";
import { useInteractive } from "@/hooks/useInteractive";
import { islandHeight } from "@/lib/three/terrain";
import { useWorld } from "@/state/world";
import { createGlowMaterial } from "../materials/glow";
import { shared } from "../materials/shared";

// Scene 06 — little surprises. No score, no list, nothing to complete.

/* ---------------------------------- Bunny ---------------------------------- */

const BUNNY_SPOTS: [number, number][] = [
  [-6.95, -2.35], // tucked behind a bush near the west rim
  [-4.75, 1.05], // by another bush, closer to the meadow
];

function Bunny() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const earL = useRef<Group>(null);
  const earR = useRef<Group>(null);
  const spot = useRef(0);
  const busy = useRef(false);
  const glint = useMemo(() => createGlowMaterial("#FFF1D6", 0), []);
  const fur = useMemo(() => new MeshStandardMaterial({ color: "#E9DCC6", roughness: 0.95 }), []);
  const inner = useMemo(() => new MeshStandardMaterial({ color: "#E8B4B0", roughness: 0.9 }), []);
  const dark = useMemo(() => new MeshStandardMaterial({ color: "#2A2220", roughness: 0.3 }), []);

  const place = (i: number) => {
    const [x, z] = BUNNY_SPOTS[i];
    return new Vector3(x, islandHeight(x, z), z);
  };

  useEffect(() => {
    const p = place(0);
    root.current?.position.copy(p);
    if (root.current) root.current.rotation.y = 0.9;
  }, []);

  const onTap = useCallback(() => {
    if (busy.current || !root.current || !body.current) return;
    busy.current = true;
    const st = useWorld.getState();
    st.touch("bunny");
    st.showMessage("Even small hops get you somewhere.");
    const from = root.current.position.clone();
    const next = (spot.current + 1) % BUNNY_SPOTS.length;
    const to = place(next);
    const reduced = st.reducedMotion;
    const r = root.current;
    const b = body.current;
    // Face the destination.
    const yaw = Math.atan2(to.x - from.x, to.z - from.z);
    const tl = gsap.timeline({
      onComplete: () => {
        spot.current = next;
        busy.current = false;
      },
    });
    tl.to(r.rotation, { y: yaw, duration: 0.35, ease: "sine.inOut" });
    const hops = reduced ? 1 : 4;
    for (let i = 1; i <= hops; i++) {
      const p = from.clone().lerp(to, i / hops);
      p.y = islandHeight(p.x, p.z);
      const state = { k: 0 };
      const start = from.clone().lerp(to, (i - 1) / hops);
      start.y = islandHeight(start.x, start.z);
      // Squash, leap (stretch), land (squash), recover.
      tl.to(b.scale, { y: 0.8, x: 1.1, duration: 0.12, ease: "sine.out" })
        .to(state, {
          k: 1,
          duration: 0.42,
          ease: "none",
          onUpdate: () => {
            r.position.lerpVectors(start, p, state.k);
            r.position.y += Math.sin(state.k * Math.PI) * 0.32;
          },
        })
        .to(b.scale, { y: 1.15, x: 0.92, duration: 0.18, ease: "sine.out" }, "<")
        .to(b.scale, { y: 0.85, x: 1.08, duration: 0.1, ease: "sine.in" })
        .to(b.scale, { y: 1, x: 1, duration: 0.25, ease: "back.out(2)" });
    }
    // Turn to look back at the visitor, ears up.
    tl.to(r.rotation, { y: yaw + 2.4, duration: 0.6, ease: "sine.inOut" });
    if (earL.current && earR.current)
      tl.to([earL.current.rotation, earR.current.rotation], { x: -0.05, duration: 0.25, yoyo: true, repeat: 1 }, "<");
  }, []);

  const { hovered, bind } = useInteractive(onTap);

  useFrame(() => {
    const t = shared.uTime.value;
    if (earL.current && earR.current && !busy.current) {
      // Occasional ear flicks, never in sync.
      const flick = Math.max(0, Math.sin(t * 0.9) - 0.92) * 6;
      earL.current.rotation.z = 0.18 + flick * 0.25;
      earR.current.rotation.z = -0.18 - Math.max(0, Math.sin(t * 0.73 + 2) - 0.92) * 1.5;
    }
    if (body.current && !busy.current) body.current.position.y = Math.sin(t * 3.2) * 0.004;
    // A soft glint every few seconds: "something's here".
    const g = Math.pow(Math.max(0, Math.sin(t * 0.6)), 12);
    glint.uniforms.uOpacity.value = g * 0.55 + (hovered ? 0.35 : 0);
  });

  useEffect(
    () => () => {
      [glint, fur, inner, dark].forEach((m) => m.dispose());
    },
    [glint, fur, inner, dark],
  );

  return (
    <group ref={root} {...bind}>
      <group ref={body}>
        <mesh material={fur} position={[0, 0.12, -0.02]} scale={[0.15, 0.13, 0.19]} castShadow>
          <sphereGeometry args={[1, 18, 14]} />
        </mesh>
        <mesh material={fur} position={[0, 0.23, 0.13]} scale={[0.09, 0.085, 0.095]} castShadow>
          <sphereGeometry args={[1, 16, 12]} />
        </mesh>
        <mesh material={fur} position={[0, 0.12, -0.21]} scale={0.045}>
          <icosahedronGeometry args={[1, 2]} />
        </mesh>
        <mesh material={inner} position={[0, 0.225, 0.222]} scale={0.012}>
          <sphereGeometry args={[1, 8, 6]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={dark} position={[s * 0.05, 0.25, 0.2]} scale={0.012}>
            <sphereGeometry args={[1, 8, 6]} />
          </mesh>
        ))}
        {[
          [earL, 1],
          [earR, -1],
        ].map(([ref, s]) => (
          <group key={s as number} ref={ref as React.RefObject<Group>} position={[(s as number) * 0.035, 0.3, 0.1]} rotation={[-0.25, 0, (s as number) * 0.18]}>
            <mesh material={fur} position={[0, 0.07, 0]} scale={[0.024, 0.08, 0.014]}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
            <mesh material={inner} position={[0, 0.07, 0.008]} scale={[0.013, 0.06, 0.008]}>
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          </group>
        ))}
      </group>
      <Billboard position={[0, 0.42, 0.05]}>
        <mesh material={glint} renderOrder={6}>
          <planeGeometry args={[0.35, 0.35]} />
        </mesh>
      </Billboard>
      <mesh visible={false} position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.38, 8, 6]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

/* ----------------------------- Hidden lantern ------------------------------ */

const LANTERN_POS: [number, number] = [6.72, -4.12];

function HiddenLantern() {
  const light = useRef<PointLight>(null);
  const lit = useRef(useWorld.getState().touched["lantern"] ? 1 : 0);
  const flare = useRef(0);
  const glass = useMemo(
    () => new MeshStandardMaterial({ color: "#3B3028", emissive: new Color("#FFB45E"), emissiveIntensity: 0, roughness: 0.3 }),
    [],
  );
  const metal = useMemo(() => new MeshStandardMaterial({ color: "#3E342C", roughness: 0.5, metalness: 0.6 }), []);
  const glow = useMemo(() => createGlowMaterial("#FFC27A", 0), []);
  const y = islandHeight(...LANTERN_POS);

  const onTap = useCallback(() => {
    const st = useWorld.getState();
    const first = !st.touched["lantern"];
    st.touch("lantern");
    st.showMessage(first ? "A little light, for whenever you need it." : "Still here. Still glowing.");
    if (first) {
      // Flicker into life, like a wick catching.
      gsap
        .timeline()
        .to(lit, { current: 0.35, duration: 0.12 })
        .to(lit, { current: 0.1, duration: 0.1 })
        .to(lit, { current: 0.6, duration: 0.15 })
        .to(lit, { current: 0.3, duration: 0.12 })
        .to(lit, { current: 1, duration: 0.9, ease: "sine.out" });
    } else {
      flare.current = 1;
    }
  }, []);
  const { hovered, bind } = useInteractive(onTap);

  useFrame((_, dt) => {
    const t = shared.uTime.value;
    flare.current = Math.max(0, flare.current - dt * 0.8);
    const f = 0.9 + 0.1 * Math.sin(t * 7.1) * Math.sin(t * 2.9 + 0.4);
    const L = lit.current * f + flare.current * 0.5;
    glass.emissiveIntensity = L * 2.4;
    // Unlit: a faint glint now and then so it can be found.
    const glint = lit.current < 0.05 ? Math.pow(Math.max(0, Math.sin(t * 0.5 + 1)), 14) * 0.5 : 0;
    glow.uniforms.uOpacity.value = L * 0.9 + glint + (hovered ? 0.25 : 0);
    if (light.current) light.current.intensity = L * 2.2;
  });

  useEffect(
    () => () => {
      [glass, metal, glow].forEach((m) => m.dispose());
    },
    [glass, metal, glow],
  );

  return (
    <group position={[LANTERN_POS[0], y, LANTERN_POS[1]]} rotation={[0.08, 0.4, -0.06]} {...bind}>
      <mesh material={metal} position={[0, 0.015, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.03, 10]} />
      </mesh>
      <mesh material={glass} position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.055, 0.06, 0.14, 10]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={metal} position={[Math.cos((i * Math.PI) / 2) * 0.062, 0.1, Math.sin((i * Math.PI) / 2) * 0.062]}>
          <boxGeometry args={[0.008, 0.15, 0.008]} />
        </mesh>
      ))}
      <mesh material={metal} position={[0, 0.2, 0]}>
        <coneGeometry args={[0.085, 0.07, 10]} />
      </mesh>
      <mesh material={metal} position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.025, 0.005, 6, 12]} />
      </mesh>
      <Billboard position={[0, 0.12, 0]}>
        <mesh material={glow} renderOrder={6}>
          <planeGeometry args={[0.9, 0.9]} />
        </mesh>
      </Billboard>
      <pointLight ref={light} position={[0, 0.15, 0]} color="#FFB869" distance={3} decay={2} intensity={0} />
      <mesh visible={false} position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.36, 8, 6]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

/* -------------------------------- Wish star -------------------------------- */

const STAR_HOME = new Vector3(-6.5, 5.0, -15);
const TRAIL = 28;

function starMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uOpacity: { value: 0 }, uTime: shared.uTime, uColor: { value: new Color("#FFF2D2") } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity, uTime; uniform vec3 uColor; varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float core = exp(-r * 9.0);
        // Four soft rays, slowly breathing.
        float rays = pow(max(0.0, 1.0 - abs(p.x) * 7.0), 2.0) * exp(-abs(p.y) * 3.0)
                   + pow(max(0.0, 1.0 - abs(p.y) * 7.0), 2.0) * exp(-abs(p.x) * 3.0);
        float tw = 0.75 + 0.25 * sin(uTime * 2.3);
        // Radial falloff so nothing ever reaches the quad's edge (no visible square).
        float a = (core * 1.6 + rays * 0.7 * tw + exp(-r * 3.0) * 0.25) * smoothstep(1.0, 0.55, r) * uOpacity;
        gl_FragColor = vec4(uColor * a, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}

function WishStar() {
  const dpr = useThree((s) => s.viewport.dpr);
  const group = useRef<Group>(null);
  const mat = useMemo(starMaterial, []);
  const pos = useMemo(() => STAR_HOME.clone(), []);
  const shooting = useRef(false);
  const visible = useRef(0);
  const trailGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(new Float32Array(TRAIL * 3), 3));
    g.setAttribute("aAge", new BufferAttribute(new Float32Array(TRAIL), 1));
    return g;
  }, []);
  const trailMat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uPixelRatio: { value: 1 }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          uniform float uPixelRatio; attribute float aAge; varying float vA;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv;
            gl_PointSize = (1.0 - aAge) * 0.22 * uPixelRatio * (420.0 / -mv.z); vA = 1.0 - aAge; }`,
        fragmentShader: /* glsl */ `
          uniform float uOpacity; varying float vA;
          void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float g = pow(max(1.0 - d, 0.0), 2.0);
            gl_FragColor = vec4(vec3(1.0, 0.93, 0.78) * g * vA * uOpacity, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );
  const history = useRef<Vector3[]>(Array.from({ length: TRAIL }, () => STAR_HOME.clone()));

  const onTap = useCallback(() => {
    if (shooting.current || shared.uStars.value < 0.5) return;
    shooting.current = true;
    const st = useWorld.getState();
    st.touch("star");
    st.showMessage("Make a wish — or just rest. Both are enough.");
    const s = { t: 0 };
    const start = STAR_HOME.clone();
    const end = new Vector3(9, 3.5, -17);
    gsap
      .timeline({ onComplete: () => (shooting.current = false) })
      .to(s, {
        t: 1,
        duration: st.reducedMotion ? 0.8 : 2.2,
        ease: "power1.in",
        onUpdate: () => {
          pos.lerpVectors(start, end, s.t);
          pos.y += Math.sin(s.t * Math.PI) * 2.2;
        },
      })
      .set(pos, { x: STAR_HOME.x, y: STAR_HOME.y - 3, z: STAR_HOME.z }, "+=3")
      .to(pos, { y: STAR_HOME.y, duration: 3, ease: "sine.out" });
  }, [pos]);

  // Only touchable when it can actually be seen.
  const isNight = useWorld((s) => s.timeOfDay === "night");
  const { hovered, active, bind } = useInteractive(onTap, isNight, ["explore", "lookout"]);

  useFrame((_, dt) => {
    const night = shared.uStars.value;
    visible.current += ((night > 0.5 ? 1 : 0) - visible.current) * Math.min(1, dt * 1.2);
    const v = visible.current;
    if (group.current) {
      group.current.visible = v > 0.01;
      group.current.position.copy(pos);
      group.current.scale.setScalar(1 + (hovered ? 0.25 : 0) + Math.sin(shared.uTime.value * 1.7) * 0.05);
    }
    mat.uniforms.uOpacity.value = v * (active || shooting.current ? 1 : 0.7);
    // Trail
    history.current.pop();
    history.current.unshift(pos.clone());
    const p = trailGeo.getAttribute("position") as BufferAttribute;
    const age = trailGeo.getAttribute("aAge") as BufferAttribute;
    history.current.forEach((h, i) => {
      p.setXYZ(i, h.x, h.y, h.z);
      age.setX(i, i / TRAIL);
    });
    p.needsUpdate = true;
    age.needsUpdate = true;
    trailMat.uniforms.uOpacity.value = shooting.current ? v : Math.max(0, trailMat.uniforms.uOpacity.value - dt);
    trailMat.uniforms.uPixelRatio.value = dpr;
  });

  useEffect(
    () => () => {
      mat.dispose();
      trailGeo.dispose();
      trailMat.dispose();
    },
    [mat, trailGeo, trailMat],
  );

  return (
    <>
      <group ref={group} {...bind}>
        <Billboard>
          <mesh material={mat} renderOrder={4}>
            <planeGeometry args={[2.2, 2.2]} />
          </mesh>
        </Billboard>
        <mesh visible={false}>
          <sphereGeometry args={[1.1, 8, 6]} />
          <meshBasicMaterial />
        </mesh>
      </group>
      <points geometry={trailGeo} material={trailMat} frustumCulled={false} renderOrder={4} />
    </>
  );
}

export function Surprises() {
  return (
    <>
      <Bunny />
      <HiddenLantern />
      <WishStar />
    </>
  );
}

