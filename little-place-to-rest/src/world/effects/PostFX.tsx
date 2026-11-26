"use client";

import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import type { QualitySettings } from "@/config/quality.config";

/**
 * Tiered post-processing.
 * - light (mid phones): soft bloom + vignette + SMAA.
 * - full (desktop): + ambient occlusion and MSAA.
 * Low tier renders without a composer at all (tone mapping is done by the renderer).
 */
export function PostFX({ settings }: { settings: QualitySettings }) {
  if (settings.postfx === "none") return null;
  const full = settings.postfx === "full";
  return (
    <EffectComposer multisampling={settings.msaa} enableNormalPass={false}>
      {full ? (
        <N8AO aoRadius={1.1} distanceFalloff={0.9} intensity={1.6} halfRes quality="medium" color="#2a2418" />
      ) : (
        <></>
      )}
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.25} radius={0.7} />
      <Vignette offset={0.3} darkness={0.42} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      {full ? <></> : <SMAA />}
    </EffectComposer>
  );
}
