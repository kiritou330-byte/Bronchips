import { shots, type Shot, type Vec3 } from "@/config/world.config";
import { useBreathing } from "@/state/breathing";
import { type Destination, destinationOf, useNavigation } from "@/state/navigation";
import { enterOrbit, flyTo, framing, initialExploreShot, orbitPosition, rig, setShot } from "./camera/rig";
import {
  arcVia,
  bridge,
  bridgeVia,
  dock,
  doorstepShot,
  insideShot,
  letterShot,
  lookoutShot,
  pondSeatShot,
  thresholdPoint,
} from "./locations";
import { cottageDoor } from "./objects/Cottage";

/**
 * High-level choreography between phases. Keeps camera, navigation state and UI in step.
 * Every move is a smooth arc; the UI waits for the camera to settle.
 */

/** The title shot depends on the screen shape so text and island never overlap. */
export function arrivalHoldShot() {
  const portrait = typeof window !== "undefined" && window.innerWidth / window.innerHeight < 0.9;
  return portrait ? shots.arrivalHoldPortrait : shots.arrivalHold;
}

export function startArrival() {
  setShot(shots.arrivalStart);
  rig.parallaxAmount = 0;
  flyTo(arrivalHoldShot(), {
    via: shots.arrivalPath,
    duration: 10,
    ease: "power2.out",
    smooth: 0.5,
    onComplete: () => {
      rig.parallaxAmount = 0.6;
    },
  });
}

export function enterWorld() {
  const nav = useNavigation.getState();
  if (nav.phase !== "arrival") return;
  nav.setPhase("entering");
  nav.setTransitioning(true);
  rig.parallaxAmount = 0;
  flyTo(initialExploreShot(), {
    // Arc up and over, then settle — reads as "stepping into" the world.
    via: [[-2.2, 8.2, 22.5]],
    duration: 4.2,
    ease: "power2.inOut",
    smooth: 0.45,
    onComplete: () => {
      enterOrbit();
      nav.setPhase("explore");
      nav.setTransitioning(false);
    },
  });
}

/** Garden orbit pose seen from behind a given point (keeps spatial continuity). */
function gardenShotFacing(x: number, z: number): Shot {
  const az = Math.atan2(x - rig.orbit.center.x, z - rig.orbit.center.z);
  const f = framing();
  const p = orbitPosition(az, 1.1, 18.5 * f.distMul, rig.orbit.center);
  return { position: [p.x, p.y, p.z], target: rig.orbit.center.toArray() as Vec3, fov: 42 + f.fovAdd };
}

/**
 * Tall phone screens see a narrow slice of each composed shot: widen the lens a little and,
 * for wide vistas, step back along the view so the framing survives.
 */
function adapt(shot: Shot, pullBack = false): Shot {
  const f = framing();
  if (f.fovAdd === 0) return shot;
  const position = [...shot.position] as Vec3;
  if (pullBack) {
    for (let i = 0; i < 3; i++) position[i] = shot.target[i] + (shot.position[i] - shot.target[i]) * (1 + (f.distMul - 1) * 0.55);
  }
  return { position, target: shot.target, fov: shot.fov + f.fovAdd * 0.8 };
}

const fly = (shot: Shot, duration: number, via?: Vec3[], ease = "power2.inOut", smooth = 0.4) =>
  new Promise<void>((resolve) => flyTo(adapt(shot, shot === lookoutShot), { duration, via, ease, smooth, onComplete: resolve }));

/** Step out through the door and close it behind us. */
async function leaveCottage() {
  const nav = useNavigation.getState();
  nav.setLetterOpen(false);
  rig.parallaxAmount = 0;
  await cottageDoor.swing(true, 1.0);
  await fly(doorstepShot, 2.4, [thresholdPoint], "power1.inOut", 0.35);
  cottageDoor.swing(false, 1.4);
}

/** Travel to a place. */
export async function goTo(dest: Destination) {
  const nav = useNavigation.getState();
  if (nav.transitioning || nav.phase === "arrival" || nav.phase === "entering") return;
  const here = destinationOf(nav.phase);
  if (here === dest) return;
  useBreathing.getState().stop();
  nav.setTransitioning(true);

  if (here === "cottage") await leaveCottage();
  const from = rig.position.toArray() as Vec3;

  if (dest === "pond") {
    nav.setPhase("pond");
    await fly(pondSeatShot, 3.6, [arcVia(from, pondSeatShot.position, 2.5)]);
    nav.setTransitioning(false);
    return;
  }

  if (dest === "lookout") {
    nav.setPhase("lookout");
    // Walk the bridge: rise over the near end, follow it across, settle on the bench.
    const nearEnd: Vec3 = [bridge.from[0] - 1.2, bridge.from[1] + 1.8, bridge.from[2] + 0.6];
    await fly(lookoutShot, here === "garden" ? 4.4 : 5.2, [arcVia(from, nearEnd, 1), nearEnd, bridgeVia], "power2.inOut", 0.45);
    rig.parallaxAmount = 0.25;
    nav.setTransitioning(false);
    return;
  }

  if (dest === "cottage") {
    nav.setPhase("cottage");
    await fly(doorstepShot, here === "pond" ? 3.0 : 3.4, [arcVia(from, doorstepShot.position, 2)]);
    await cottageDoor.swing(true, 1.3);
    await fly(insideShot, 2.8, [thresholdPoint], "power1.inOut", 0.35);
    cottageDoor.swing(false, 1.6);
    rig.parallaxAmount = 0.12;
    nav.setTransitioning(false);
    return;
  }

  // Garden: rise from wherever we are, then settle into orbit.
  const to =
    here === "pond"
      ? gardenShotFacing(dock.tip[0], dock.tip[1])
      : here === "lookout"
        ? gardenShotFacing(bridge.from[0], bridge.from[2])
        : gardenShotFacing(doorstepShot.position[0], doorstepShot.position[2]);
  rig.parallaxAmount = 0;
  nav.setPhase("explore");
  await fly(to, 3.4, [arcVia(from, to.position, 1.5)]);
  enterOrbit();
  nav.setTransitioning(false);
}

/** Scene 05 — lean over the table, open the envelope (first time), then show the letter page. */
export async function openLetter(animateOpen?: () => gsap.core.Timeline) {
  const nav = useNavigation.getState();
  if (nav.transitioning || nav.phase !== "cottage") return;
  nav.setTransitioning(true);
  nav.setPhase("letter");
  rig.parallaxAmount = 0;
  await fly(letterShot, 2.0, undefined, "power2.inOut", 0.35);
  if (animateOpen) await new Promise<void>((r) => animateOpen().eventCallback("onComplete", () => r()));
  nav.setLetterOpen(true);
  nav.setTransitioning(false);
}

export async function closeLetter() {
  const nav = useNavigation.getState();
  if (nav.phase !== "letter") return;
  nav.setLetterOpen(false);
  nav.setTransitioning(true);
  await fly(insideShot, 2.0, undefined, "power2.inOut", 0.4);
  nav.setPhase("cottage");
  rig.parallaxAmount = 0.12;
  nav.setTransitioning(false);
}
