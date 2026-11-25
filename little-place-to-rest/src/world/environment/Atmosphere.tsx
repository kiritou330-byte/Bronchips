"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, FogExp2, type DirectionalLight, type HemisphereLight, Object3D, Vector3 } from "three";
import { atmospheres } from "@/config/world.config";
import { useWorld } from "@/state/world";
import { live, shared } from "../materials/shared";

const tmpColor = new Color();
const tmpVec = new Vector3();

/**
 * Owns the sun, sky light and fog, and smoothly interpolates every atmosphere value
 * towards the selected time of day (~4 s settle, exponential so it never "snaps").
 */
export function Atmosphere({ shadows, shadowMapSize }: { shadows: boolean; shadowMapSize: number }) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const sunTarget = useMemo(() => new Object3D(), []);

  useEffect(() => {
    const fog = new FogExp2(live.fogColor.getHex(), live.fogDensity);
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  useEffect(() => {
    if (!sun.current) return;
    sun.current.target = sunTarget;
    // Props set the frustum but don't rebuild the projection: without this the shadow
    // camera keeps its ±5 default and most of the island receives no shadow.
    sun.current.shadow.camera.updateProjectionMatrix();
    sun.current.shadow.needsUpdate = true;
  }, [sunTarget, shadowMapSize, shadows]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    shared.uTime.value += dt;

    const p = atmospheres[useWorld.getState().timeOfDay];
    const k = 1 - Math.exp(-dt * 0.9);

    shared.uSkyTop.value.lerp(tmpColor.set(p.skyTop), k);
    shared.uSkyHorizon.value.lerp(tmpColor.set(p.skyHorizon), k);
    shared.uSkyBottom.value.lerp(tmpColor.set(p.skyBottom), k);
    shared.uSunColor.value.lerp(tmpColor.set(p.sunColor), k);
    shared.uCloudShade.value.lerp(tmpColor.set(p.cloudShade), k);
    shared.uSunDir.value.lerp(tmpVec.set(...p.sunDirection).normalize(), k).normalize();
    shared.uSunDisc.value += (p.sunDiscSize - shared.uSunDisc.value) * k;
    shared.uSunGlow.value += (p.sunGlow - shared.uSunGlow.value) * k;
    shared.uWindowGlow.value += (p.windowGlow - shared.uWindowGlow.value) * k;
    shared.uFireflies.value += (p.fireflies - shared.uFireflies.value) * k;
    shared.uStars.value += (p.stars - shared.uStars.value) * k;
    shared.uShafts.value += (p.shafts - shared.uShafts.value) * k;
    shared.uNight.value += (p.stars - shared.uNight.value) * k;
    shared.uWind.value += (p.wind - shared.uWind.value) * k;

    live.sunIntensity += (p.sunIntensity - live.sunIntensity) * k;
    live.hemiIntensity += (p.hemiIntensity - live.hemiIntensity) * k;
    live.hemiSky.lerp(tmpColor.set(p.hemiSky), k);
    live.hemiGround.lerp(tmpColor.set(p.hemiGround), k);
    live.fogColor.lerp(tmpColor.set(p.fogColor), k);
    live.fogDensity += (p.fogDensity - live.fogDensity) * k;
    live.exposure += (p.exposure - live.exposure) * k;

    if (sun.current) {
      const d = shared.uSunDir.value;
      sun.current.position.set(d.x * 30, d.y * 30, d.z * 30);
      sun.current.color.copy(shared.uSunColor.value);
      sun.current.intensity = live.sunIntensity;
    }
    if (hemi.current) {
      hemi.current.color.copy(live.hemiSky);
      hemi.current.groundColor.copy(live.hemiGround);
      hemi.current.intensity = live.hemiIntensity * (1 + shared.uAudioLow.value * 0.06);
    }
    const fog = scene.fog as FogExp2 | null;
    if (fog) {
      fog.color.copy(live.fogColor);
      fog.density = live.fogDensity;
    }
    gl.toneMappingExposure = live.exposure;
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={[live.hemiSky, live.hemiGround, live.hemiIntensity]} />
      <directionalLight
        ref={sun}
        castShadow={shadows}
        intensity={live.sunIntensity}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.035}
        shadow-radius={4}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={5}
        shadow-camera-far={70}
      />
      <primitive object={sunTarget} position={[0, 0, 0]} />
    </>
  );
}
