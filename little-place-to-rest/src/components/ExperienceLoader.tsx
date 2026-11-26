"use client";

import dynamic from "next/dynamic";

// The 3D experience is client-only (WebGL); the server only ships the calm background colour.
const Experience = dynamic(() => import("./Experience"), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-[var(--bg)]" />,
});

export default function ExperienceLoader({ musicAvailable }: { musicAvailable: boolean }) {
  return <Experience musicAvailable={musicAvailable} />;
}
