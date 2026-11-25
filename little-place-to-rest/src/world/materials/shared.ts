import { Color, Vector3 } from "three";
import { atmospheres, defaultTimeOfDay, type AtmospherePreset } from "@/config/world.config";

/**
 * Uniforms shared by every custom shader in the world. They are updated once per frame by
 * <AtmosphereController/>, so all materials stay in sync without re-rendering React.
 */
export const shared = {
  uTime: { value: 0 },
  uWind: { value: 1 },
  uSunDir: { value: new Vector3(...atmospheres[defaultTimeOfDay].sunDirection).normalize() },
  uSunColor: { value: new Color(atmospheres[defaultTimeOfDay].sunColor) },
  /** 0 = day, 1 = full night. */
  uNight: { value: 0 },
  uWindowGlow: { value: atmospheres[defaultTimeOfDay].windowGlow },
  uFireflies: { value: atmospheres[defaultTimeOfDay].fireflies },
  uStars: { value: 0 },
  uShafts: { value: atmospheres[defaultTimeOfDay].shafts },
  uSkyTop: { value: new Color(atmospheres[defaultTimeOfDay].skyTop) },
  uSkyHorizon: { value: new Color(atmospheres[defaultTimeOfDay].skyHorizon) },
  uSkyBottom: { value: new Color(atmospheres[defaultTimeOfDay].skyBottom) },
  uSunDisc: { value: atmospheres[defaultTimeOfDay].sunDiscSize },
  uSunGlow: { value: atmospheres[defaultTimeOfDay].sunGlow },
  uCloudShade: { value: new Color(atmospheres[defaultTimeOfDay].cloudShade) },
  /** Smoothed music loudness 0..1 (0 when music is off or reactive mode disabled). */
  uAudio: { value: 0 },
};

/** Live (interpolated) atmosphere values for things that are not shader uniforms. */
export const live = {
  sunIntensity: atmospheres[defaultTimeOfDay].sunIntensity,
  hemiSky: new Color(atmospheres[defaultTimeOfDay].hemiSky),
  hemiGround: new Color(atmospheres[defaultTimeOfDay].hemiGround),
  hemiIntensity: atmospheres[defaultTimeOfDay].hemiIntensity,
  fogColor: new Color(atmospheres[defaultTimeOfDay].fogColor),
  fogDensity: atmospheres[defaultTimeOfDay].fogDensity,
  exposure: atmospheres[defaultTimeOfDay].exposure,
};

export type { AtmospherePreset };
