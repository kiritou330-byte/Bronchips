import { shots } from "@/config/world.config";
import { useNavigation } from "@/state/navigation";
import { enterOrbit, flyTo, initialExploreShot, rig, setShot } from "./camera/rig";

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
