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
