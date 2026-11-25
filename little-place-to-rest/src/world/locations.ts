import { layout, type Shot, type Vec3 } from "@/config/world.config";
import { islandHeight, pondWaterLevel } from "@/lib/three/terrain";

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
