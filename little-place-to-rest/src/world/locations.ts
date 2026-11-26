import { layout, type Shot, type Vec3 } from "@/config/world.config";
import { islandHeight, islandRadiusAt, pondWaterLevel } from "@/lib/three/terrain";
import { noise2 } from "@/lib/three/noise";

// Places the visitor can travel to. Derived from the layout so moving the pond or the
// cottage in world.config automatically moves its camera shots too.

const [PX, PZ] = layout.pond.position;
const PR = layout.pond.radius;

/** Direction (top-down) from the pond centre towards the dock/shore. */
export const DOCK_ANGLE = 3.55;
const dir: [number, number] = [Math.cos(DOCK_ANGLE), Math.sin(DOCK_ANGLE)];

export const dock = {
  /** Where the dock meets the shore. */
  shore: [PX + dir[0] * PR, PZ + dir[1] * PR] as [number, number],
  /** Tip of the dock over the water. */
  tip: [PX + dir[0] * (PR - 0.95), PZ + dir[1] * (PR - 0.95)] as [number, number],
  dir,
  deckY: pondWaterLevel + 0.16,
};

/**
 * Sitting on the dock: a seated eye-line a little above the deck, gazing down across the
 * water so the pond fills the lower frame with the far bank and sky above.
 */
export const pondSeatShot: Shot = {
  position: [dock.shore[0] - dir[0] * 0.15, dock.deckY + 1.38, dock.shore[1] - dir[1] * 0.15],
  target: [PX - dir[0] * 0.9, pondWaterLevel + 0.15, PZ - dir[1] * 0.9],
  fov: 50,
};

/** Point above the water where the breathing light floats. */
export const breathPoint: Vec3 = [PX - dir[0] * 0.25, pondWaterLevel + 0.42, PZ - dir[1] * 0.25];

/** A high waypoint so flights arc gracefully instead of cutting through trees. */
export function arcVia(from: Vec3, to: Vec3, lift = 4): Vec3 {
  const mx = (from[0] + to[0]) / 2;
  const mz = (from[2] + to[2]) / 2;
  const ground = islandHeight(mx, mz);
  return [mx, Math.max(from[1], to[1], ground + 2) + lift, mz];
}

// --- Cottage -------------------------------------------------------------------------
const [CX, CZ] = layout.cottage.position;
const CROT = layout.cottage.rotationY;
export const cottageFloorY = islandHeight(CX, CZ);

/** Cottage-local (origin = floor centre, door faces +z) → world. */
export function cottageToWorld(x: number, y: number, z: number): Vec3 {
  const c = Math.cos(CROT),
    s = Math.sin(CROT);
  return [CX + x * c + z * s, cottageFloorY + y, CZ - x * s + z * c];
}

/** Standing on the porch, facing the door. */
export const doorstepShot: Shot = {
  position: cottageToWorld(0.12, 1.25, 3.75),
  target: cottageToWorld(0, 0.7, 1.3),
  fov: 46,
};
/** Just through the doorway — the moment of stepping in. */
export const thresholdPoint: Vec3 = cottageToWorld(0, 0.82, 1.05);
/** Inside, from near the door: the whole little room. */
export const insideShot: Shot = {
  position: cottageToWorld(0.25, 1.02, 0.85),
  target: cottageToWorld(-0.35, 0.5, -0.75),
  fov: 62,
};
/** Close over the table, looking down at the envelope. */
export const letterShot: Shot = {
  position: cottageToWorld(-0.08, 1.02, -0.05),
  target: cottageToWorld(-0.22, 0.5, -0.5),
  fov: 40,
};

// --- Lookout islet (Scene 07) -----------------------------------------------------------
const BRIDGE_ANGLE = -0.22;
const fromR = islandRadiusAt(BRIDGE_ANGLE) * 0.94;
const bridgeFrom: Vec3 = [Math.cos(BRIDGE_ANGLE) * fromR, 0, Math.sin(BRIDGE_ANGLE) * fromR];
bridgeFrom[1] = islandHeight(bridgeFrom[0], bridgeFrom[2]) + 0.04;

const ISLET_R = 2.5;
const isletCenter: Vec3 = [16.2, bridgeFrom[1] - 0.75, -4.1];
const toMain = [bridgeFrom[0] - isletCenter[0], bridgeFrom[2] - isletCenter[2]];
const toMainLen = Math.hypot(toMain[0], toMain[1]);
const tmx = toMain[0] / toMainLen;
const tmz = toMain[1] / toMainLen;

/** Gentle dome on the islet. */
export function isletHeight(x: number, z: number) {
  const dx = x - isletCenter[0],
    dz = z - isletCenter[2];
  const r2 = (dx * dx + dz * dz) / (ISLET_R * ISLET_R);
  return isletCenter[1] + 0.32 * (1 - Math.min(r2, 1.3)) + noise2(x * 0.9, z * 0.9) * 0.05;
}

export const islet = {
  center: isletCenter,
  radius: ISLET_R,
  /** Bench sits on the far side, facing back towards the main island. */
  bench: [isletCenter[0] - tmx * 0.55, isletCenter[2] - tmz * 0.55] as [number, number],
  benchYaw: Math.atan2(tmx, tmz),
  stone: [isletCenter[0] + tmz * 1.4 - tmx * 0.3, isletCenter[2] - tmx * 1.4 - tmz * 0.3] as [number, number],
};

export const bridge = {
  from: bridgeFrom,
  to: [isletCenter[0] + tmx * ISLET_R * 0.9, 0, isletCenter[2] + tmz * ISLET_R * 0.9] as Vec3,
};
bridge.to[1] = isletHeight(bridge.to[0], bridge.to[2]) + 0.04;

/** Sitting on the bench: the island, the sky and (at golden hour) the sun behind it. */
export const lookoutShot: Shot = {
  // Behind the bench and a little to the side, so the bridge becomes a diagonal leading line.
  position: [
    islet.bench[0] - tmx * 1.1 - tmz * 0.95,
    isletHeight(islet.bench[0], islet.bench[1]) + 1.3,
    islet.bench[1] - tmz * 1.1 + tmx * 0.95,
  ],
  // Look a little above the island: it sits in the lower third, the sky fills the rest.
  target: [1.5, 4.4, -1.2],
  fov: 52,
};

/** Waypoint above the middle of the bridge so the flight follows it. */
export const bridgeVia: Vec3 = [
  (bridge.from[0] + bridge.to[0]) / 2,
  Math.max(bridge.from[1], bridge.to[1]) + 1.6,
  (bridge.from[2] + bridge.to[2]) / 2,
];
