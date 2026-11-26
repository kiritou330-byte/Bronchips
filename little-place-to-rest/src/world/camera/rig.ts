import gsap from "gsap";
import { CatmullRomCurve3, Vector3 } from "three";
import { orbit as orbitCfg, type Shot, type Vec3 } from "@/config/world.config";

/**
 * Camera rig singleton. Nothing sets the camera directly: code moves a *target*
 * (position, look-at, fov) and <CameraRig/> chases it with critically-damped springs,
 * so even interrupted transitions never jump.
 */
export type RigMode = "cinematic" | "orbit";

export const rig = {
  mode: "cinematic" as RigMode,
  position: new Vector3(),
  lookAt: new Vector3(),
  fov: 40,
  /** Spring smooth time (s). Lower = tighter follow. */
  smooth: 0.35,
  /** Small pointer-driven offset used while holding a cinematic shot. */
  parallax: new Vector3(),
  parallaxAmount: 0,
  orbit: {
    center: new Vector3(...orbitCfg.center),
    azimuth: orbitCfg.azimuth.initial,
    polar: orbitCfg.polar.initial,
    distance: orbitCfg.distance.initial,
    vAzimuth: 0,
    vPolar: 0,
    /** Whether a finger/mouse is currently dragging. */
    dragging: false,
    /** Seconds since the last user input (drives idle drift). */
    idle: 0,
  },
  /** A brief glance towards a point of interest while orbiting (0 = none). */
  glance: { point: new Vector3(), weight: 0 },
  tween: null as gsap.core.Tween | gsap.core.Timeline | null,
  reducedMotion: false,
};

/**
 * Tall screens see much less of the island horizontally, so widen the lens a little and
 * step back. Returns 0 on landscape, up to 1 on a narrow phone.
 */
export function framing() {
  const aspect = typeof window === "undefined" ? 1.6 : window.innerWidth / window.innerHeight;
  const k = Math.min(1, Math.max(0, (1.05 - aspect) / 0.6));
  return { distMul: 1 + 0.42 * k, fovAdd: 14 * k };
}

export function orbitPosition(azimuth: number, polar: number, distance: number, center: Vector3, out = new Vector3()) {
  return out.set(
    center.x + distance * Math.sin(polar) * Math.sin(azimuth),
    center.y + distance * Math.cos(polar),
    center.z + distance * Math.sin(polar) * Math.cos(azimuth),
  );
}

export function initialExploreShot(): Shot {
  const f = framing();
  const p = orbitPosition(orbitCfg.azimuth.initial, orbitCfg.polar.initial, orbitCfg.distance.initial * f.distMul, rig.orbit.center);
  return { position: [p.x, p.y, p.z], target: [...orbitCfg.center] as Vec3, fov: orbitCfg.fov + f.fovAdd };
}

/** Jump the rig target (and, via `snap`, the camera) to a shot instantly. */
export function setShot(shot: Shot) {
  rig.tween?.kill();
  rig.mode = "cinematic";
  rig.position.set(...shot.position);
  rig.lookAt.set(...shot.target);
  rig.fov = shot.fov;
}

export interface FlyOptions {
  duration?: number;
  /** Extra waypoints between the current position and the shot. */
  via?: Vec3[];
  ease?: string;
  /** Spring smoothing during the flight. */
  smooth?: number;
  onComplete?: () => void;
}

/** Fly the target along a smooth curve to a shot. */
export function flyTo(shot: Shot, o: FlyOptions = {}) {
  rig.tween?.kill();
  rig.mode = "cinematic";
  const from = rig.position.clone();
  const fromLook = rig.lookAt.clone();
  const fromFov = rig.fov;
  const to = new Vector3(...shot.position);
  const toLook = new Vector3(...shot.target);
  const reduced = rig.reducedMotion;
  const pts = [from, ...(reduced ? [] : (o.via ?? []).map((v) => new Vector3(...v))), to];
  const curve = pts.length > 2 ? new CatmullRomCurve3(pts, false, "centripetal", 0.5) : null;
  const state = { t: 0 };
  rig.smooth = o.smooth ?? 0.35;
  rig.tween = gsap.to(state, {
    t: 1,
    duration: reduced ? Math.min(1.6, (o.duration ?? 3) * 0.5) : (o.duration ?? 3),
    ease: o.ease ?? "power2.inOut",
    onUpdate: () => {
      if (curve) curve.getPoint(state.t, rig.position);
      else rig.position.lerpVectors(from, to, state.t);
      // Look-at leads slightly so the camera "anticipates" where it is going.
      const lt = Math.min(1, state.t * 1.12);
      rig.lookAt.lerpVectors(fromLook, toLook, lt * lt * (3 - 2 * lt));
      rig.fov = fromFov + (shot.fov - fromFov) * state.t;
    },
    onComplete: () => {
      rig.tween = null;
      o.onComplete?.();
    },
  });
  return rig.tween;
}

let glanceTween: gsap.core.Timeline | null = null;
/** Let the camera's attention drift towards something for a moment, then come back. */
export function glanceAt(x: number, y: number, z: number, hold = 2.4) {
  if (rig.reducedMotion) return;
  glanceTween?.kill();
  rig.glance.point.set(x, y, z);
  glanceTween = gsap
    .timeline()
    .to(rig.glance, { weight: 1, duration: 1.6, ease: "sine.inOut" })
    .to(rig.glance, { weight: 0, duration: 2.6, ease: "sine.inOut" }, `+=${hold}`);
}

/** Hand control to the orbit controller, continuing from wherever the camera currently is. */
export function enterOrbit() {
  rig.tween?.kill();
  rig.tween = null;
  const o = rig.orbit;
  const rel = rig.position.clone().sub(o.center);
  const len = rel.length();
  o.distance = len / framing().distMul;
  o.polar = Math.acos(Math.min(1, Math.max(-1, rel.y / len)));
  o.azimuth = Math.atan2(rel.x, rel.z);
  o.vAzimuth = 0;
  o.vPolar = 0;
  o.idle = 0;
  rig.lookAt.copy(o.center);
  rig.fov = orbitCfg.fov + framing().fovAdd;
  rig.smooth = 0.32;
  rig.mode = "orbit";
}
