"use client";

import { AnimatePresence, motion } from "motion/react";
import { useNavigation } from "@/state/navigation";
import { SceneNav } from "../navigation/SceneNav";
import { ArrivalOverlay } from "./ArrivalOverlay";
import { BreathingPanel } from "./BreathingPanel";
import { CottagePanel } from "./CottagePanel";
import { LetterOverlay } from "./LetterOverlay";
import { LookoutPanel } from "./LookoutPanel";
import { ExploreHint } from "./ExploreHint";
import { MessageToast } from "./MessageToast";

/** All DOM UI that floats over the world. Kept sparse on purpose. */
export function Overlay() {
  const ready = useNavigation((s) => s.ready);
  const phase = useNavigation((s) => s.phase);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* Soft veil while shaders compile — a fade, not a loading screen. */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="veil"
            className="absolute inset-0 bg-[var(--bg)]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 2.2, ease: [0.4, 0, 0.2, 1] } }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{ready && phase === "arrival" && <ArrivalOverlay key="arrival" />}</AnimatePresence>

      <AnimatePresence>
        {(phase === "explore" || phase === "pond" || phase === "cottage" || phase === "lookout") && (
          <motion.div
            key="wordmark"
            className="absolute left-5 top-5 font-display text-[15px] italic tracking-wide text-[var(--ink)] [text-shadow:var(--shadow)] sm:left-8 sm:top-7 sm:text-[17px]"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 0.9, y: 0, transition: { duration: 1.4, delay: 0.4 } }}
            exit={{ opacity: 0 }}
          >
            a little place to rest
          </motion.div>
        )}
      </AnimatePresence>

      <SceneNav />
      <BreathingPanel />
      <CottagePanel />
      <LetterOverlay />
      <LookoutPanel />
      <ExploreHint />
      <MessageToast />
    </div>
  );
}
