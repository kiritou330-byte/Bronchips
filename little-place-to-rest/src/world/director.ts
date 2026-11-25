import { shots, type Vec3 } from "@/config/world.config";
import { useBreathing } from "@/state/breathing";
import { type Destination, destinationOf, useNavigation } from "@/state/navigation";
import { enterOrbit, flyTo, framing, initialExploreShot, orbitPosition, rig, setShot } from "./camera/rig";
import { arcVia, dock, pondSeatShot } from "./locations";

/**
 * High-level choreography between phases. Keeps camera, navigation state and UI in step.
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
  const target = initialExploreShot();
  flyTo(target, {
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

/** Garden orbit pose looking at the island from behind a given point (keeps spatial continuity). */
function gardenShotFacing(x: number, z: number) {
  const az = Math.atan2(x - rig.orbit.center.x, z - rig.orbit.center.z);
  const f = framing();
  const p = orbitPosition(az, 1.1, 18.5 * f.distMul, rig.orbit.center);
  return { position: [p.x, p.y, p.z] as Vec3, target: rig.orbit.center.toArray() as Vec3, fov: 42 + f.fovAdd };
}

/** Travel to a place. Every leg is a smooth arc; the UI waits until the camera settles. */
export function goTo(dest: Destination) {
  const nav = useNavigation.getState();
  if (nav.transitioning || nav.phase === "arrival" || nav.phase === "entering") return;
  if (destinationOf(nav.phase) === dest) return;
  useBreathing.getState().stop();

  const from = rig.position.toArray() as Vec3;
  nav.setTransitioning(true);

  if (dest === "pond") {
    const to = pondSeatShot;
    flyTo(to, {
      via: [arcVia(from, to.position, 2.5)],
      duration: 3.6,
      ease: "power2.inOut",
      smooth: 0.4,
      onComplete: () => {
        nav.setPhase("pond");
        nav.setTransitioning(false);
      },
    });
    nav.setPhase("pond");
    return;
  }

  // Back to the garden: rise from wherever we are, then settle into orbit.
  const to = gardenShotFacing(dock.tip[0], dock.tip[1]);
  nav.setPhase("explore");
  flyTo(to, {
    via: [arcVia(from, to.position, 1.5)],
    duration: 3.4,
    ease: "power2.inOut",
    smooth: 0.4,
    onComplete: () => {
      enterOrbit();
      nav.setTransitioning(false);
    },
  });
}
