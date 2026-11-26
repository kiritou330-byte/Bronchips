"use client";

import { Hand } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { messages } from "@/config/messages.config";
import { useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";

/** First-time hint: how to look around. Fades away after the first interaction or on its own. */
export function ExploreHint() {
  const phase = useNavigation((s) => s.phase);
  const dismissed = useWorld((s) => s.hintDismissed);
  const [timedOut, setTimedOut] = useState(false);
  const [coarse, setCoarse] = useState(true);

  useEffect(() => {
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (phase !== "explore") return;
    const id = setTimeout(() => setTimedOut(true), 16000);
    return () => clearTimeout(id);
  }, [phase]);

  const show = phase === "explore" && !dismissed && !timedOut;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="hint"
          className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] flex justify-center px-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1.2, delay: 1.2 } }}
          exit={{ opacity: 0, y: 6, transition: { duration: 0.8 } }}
        >
          <div className="flex items-center gap-2.5 font-ui text-[0.78rem] tracking-wide text-[var(--ink)] [text-shadow:var(--shadow)]">
            <motion.span
              animate={{ x: [0, 6, -4, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
              className="opacity-90"
            >
              <Hand size={15} strokeWidth={1.5} />
            </motion.span>
            {coarse ? messages.hints.explore : messages.hints.exploreMouse}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
