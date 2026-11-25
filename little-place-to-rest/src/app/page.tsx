import fs from "node:fs";
import path from "node:path";
import ExperienceLoader from "@/components/ExperienceLoader";
import { music } from "@/config/audio.config";

/** Resolved at build time: is the owner's song actually in /public? No song → no music UI. */
function hasMusicFile() {
  if (!music.enabled) return false;
  try {
    return fs.statSync(path.join(process.cwd(), "public", music.src.replace(/^\//, ""))).isFile();
  } catch {
    return false;
  }
}

export default function Page() {
  return (
    <main>
      <ExperienceLoader musicAvailable={hasMusicFile()} />
    </main>
  );
}
