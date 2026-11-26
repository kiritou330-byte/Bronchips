// Central world configuration: layout, atmosphere presets, and camera shots.
// Everything that defines "how the world looks" lives here so it can be tuned in one place.

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export const recipient = {
  /** Short name used in greetings. */
  name: "Chel",
};

export const layout = {
  /** Base radius of the island's walkable top. Edge is made organic with noise. */
  islandRadius: 9,
  /** Depth of the rocky underside below the rim. */
  islandDepth: 7.5,
  cottage: { position: [-2.5, -1.7] as Vec2, rotationY: 0.42 },
  pond: { position: [3.3, 2.3] as Vec2, radius: 1.75 },
  /** Dirt path (top-down polyline) from the cottage porch to the pond and to the east rim. */
  path: [
    [-1.75, -0.45],
    [-0.6, 0.6],
    [0.8, 1.2],
    [1.75, 1.55],
  ] as Vec2[],
  trees: [
    { kind: "oak", position: [-5.4, -3.9] as Vec2, scale: 1.25, seed: 11 },
    { kind: "oak", position: [5.7, -2.6] as Vec2, scale: 1.0, seed: 23 },
    { kind: "oak", position: [0.9, -5.6] as Vec2, scale: 0.82, seed: 37 },
    { kind: "pine", position: [-6.7, 1.3] as Vec2, scale: 1.0, seed: 41 },
    { kind: "pine", position: [-3.1, -6.6] as Vec2, scale: 1.15, seed: 53 },
    { kind: "pine", position: [7.1, 1.0] as Vec2, scale: 0.85, seed: 61 },
    { kind: "pine", position: [3.4, -6.4] as Vec2, scale: 0.75, seed: 67 },
  ],
  bushes: [
    { position: [-0.4, -2.2] as Vec2, scale: 0.75, seed: 3 },
    { position: [-4.4, 0.6] as Vec2, scale: 0.9, seed: 5 },
    { position: [1.6, 4.6] as Vec2, scale: 0.7, seed: 7 },
    { position: [5.6, 4.4] as Vec2, scale: 0.85, seed: 9 },
    { position: [-2.2, 4.9] as Vec2, scale: 0.65, seed: 13 },
    { position: [4.0, -4.2] as Vec2, scale: 0.6, seed: 17 },
    { position: [-6.4, -1.8] as Vec2, scale: 0.7, seed: 19 },
  ],
  /** Flowers that bloom when touched (bud state until then). */
  interactiveFlowers: [
    { position: [0.2, 3.1] as Vec2, color: "#F4B6A6", seed: 101 },
    { position: [-3.9, 2.6] as Vec2, color: "#C9B8E8", seed: 102 },
    { position: [2.9, -1.4] as Vec2, color: "#F7D58B", seed: 103 },
  ],
};

export type TimeOfDay = "morning" | "golden" | "night";

export interface AtmospherePreset {
  label: string;
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  /** Direction *towards* the sun (or moon at night). Normalised at runtime. */
  sunDirection: Vec3;
  sunColor: string;
  sunIntensity: number;
  sunDiscSize: number;
  sunGlow: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fogColor: string;
  fogDensity: number;
  exposure: number;
  /** 0..1 — warm emissive windows, lanterns. */
  windowGlow: number;
  fireflies: number;
  stars: number;
  /** 0..1 — fake volumetric light shafts. */
  shafts: number;
  /** Tint applied to the cloud sea's shadow side. */
  cloudShade: string;
  /** Wind strength multiplier. */
  wind: number;
}

export const atmospheres: Record<TimeOfDay, AtmospherePreset> = {
  morning: {
    label: "Morning",
    skyTop: "#6E97CC",
    skyHorizon: "#DCE7EF",
    skyBottom: "#EEF1F0",
    sunDirection: [0.55, 0.62, 0.35],
    sunColor: "#FFF2DC",
    sunIntensity: 2.7,
    sunDiscSize: 0.9,
    sunGlow: 0.55,
    hemiSky: "#CFE0F3",
    hemiGround: "#76815C",
    hemiIntensity: 1.3,
    fogColor: "#D9E4EC",
    fogDensity: 0.0105,
    exposure: 1.0,
    windowGlow: 0.15,
    fireflies: 0.0,
    stars: 0,
    shafts: 0.55,
    cloudShade: "#B9C6D8",
    wind: 0.9,
  },
  golden: {
    label: "Golden Hour",
    skyTop: "#7D8FBE",
    skyHorizon: "#F7C99B",
    skyBottom: "#EBB892",
    sunDirection: [-0.86, 0.3, 0.08],
    sunColor: "#FFC688",
    sunIntensity: 4.0,
    sunDiscSize: 1.25,
    sunGlow: 1.0,
    hemiSky: "#C3C6E0",
    hemiGround: "#8C7452",
    hemiIntensity: 1.05,
    fogColor: "#EEC6A3",
    fogDensity: 0.0105,
    exposure: 1.08,
    windowGlow: 0.55,
    fireflies: 0.25,
    stars: 0,
    shafts: 1.0,
    cloudShade: "#C3A9C4",
    wind: 1.0,
  },
  night: {
    label: "Night",
    skyTop: "#070D20",
    skyHorizon: "#283A63",
    skyBottom: "#1A2645",
    sunDirection: [0.42, 0.55, -0.72],
    sunColor: "#A8BCE8",
    sunIntensity: 0.75,
    sunDiscSize: 0.65,
    sunGlow: 0.35,
    hemiSky: "#3A4E82",
    hemiGround: "#151A28",
    hemiIntensity: 0.6,
    fogColor: "#1E2C4C",
    fogDensity: 0.012,
    exposure: 1.05,
    windowGlow: 1.0,
    fireflies: 1.0,
    stars: 1,
    shafts: 0,
    cloudShade: "#2D3A5E",
    wind: 0.6,
  },
};

export const defaultTimeOfDay: TimeOfDay = "golden";

/** Camera shots. `position` and `target` are world-space; fov in degrees. */
export interface Shot {
  position: Vec3;
  target: Vec3;
  fov: number;
}

export const shots = {
  /** Far away, among the clouds — where the arrival begins. */
  arrivalStart: { position: [-34, 9, 66], target: [0, -2.5, 0], fov: 38 },
  /** Path the camera drifts through during the arrival (excluding start/end). */
  arrivalPath: [
    [-24, 6.5, 48],
    [-12, 5.2, 34],
  ] as Vec3[],
  /** Title framing on wide screens: island to the right, text on the left. */
  arrivalHold: { position: [-5, 5.5, 31], target: [-6.4, -0.6, 0], fov: 40 },
  /** Title framing on tall screens: island in the upper half, text below. */
  arrivalHoldPortrait: { position: [-3, 7.5, 44], target: [0, -6.2, 0], fov: 52 },
} satisfies Record<string, Shot | Vec3[]>;

/** Orbit limits for free exploration. Angles in radians. */
export const orbit = {
  center: [0, 0.2, 0] as Vec3,
  distance: { min: 9.5, max: 28, initial: 22 },
  polar: { min: 0.6, max: 1.36, initial: 1.17 },
  azimuth: { initial: -0.12 },
  /** Radians per pixel of drag. */
  rotateSpeed: 0.0055,
  /** Velocity retained per 1/60s frame (inertia). */
  inertia: 0.9,
  fov: 42,
};
