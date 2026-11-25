"use client";

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { type Material, type Mesh } from "three";
import type { QualitySettings } from "@/config/quality.config";
import { layout } from "@/config/world.config";
import type { Quality } from "@/state/world";
import { Atmosphere } from "./environment/Atmosphere";
import { Motes } from "./environment/Motes";
import { Sky } from "./environment/Sky";
import { CloudSystem } from "./environment/CloudSystem";
import { Cottage } from "./objects/Cottage";
import { Flowers } from "./objects/Flowers";
import { Grass } from "./objects/Grass";
import { InteractiveFlower } from "./objects/InteractiveFlower";
import { Island } from "./objects/Island";
import { Pond } from "./objects/Pond";
import { Trees } from "./objects/Trees";

export function World({ quality, settings }: { quality: Quality; settings: QualitySettings }) {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);

  // Shadow on/off needs every material to recompile.
  useEffect(() => {
    gl.shadowMap.enabled = settings.shadows;
    gl.shadowMap.needsUpdate = true;
    scene.traverse((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      if (!m) return;
      (Array.isArray(m) ? m : [m]).forEach((mm) => (mm.needsUpdate = true));
    });
  }, [settings.shadows, gl, scene]);

  return (
    <>
      <Atmosphere shadows={settings.shadows} shadowMapSize={settings.shadowMapSize} />
      <Sky />
      <CloudSystem quality={quality} />
      <Island shadows={settings.shadows} />
      <Grass count={settings.grass} shadows={settings.shadows} />
      <Flowers count={settings.flowers} shadows={settings.shadows} />
      <Pond shadows={settings.shadows} />
      <Trees shadows={settings.shadows} detail={settings.foliageDetail} />
      <Cottage shadows={settings.shadows} />
      {layout.interactiveFlowers.map((f, i) => (
        <InteractiveFlower
          key={f.seed}
          id={`flower-${i}`}
          position={f.position}
          color={f.color}
          seed={f.seed}
          messageIndex={i}
        />
      ))}
      <Motes kind="dust" count={settings.dust} />
      <Motes kind="firefly" count={settings.fireflies} />
    </>
  );
}
