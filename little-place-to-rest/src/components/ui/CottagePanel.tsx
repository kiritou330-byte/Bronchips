"use client";

import { ChevronLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";
import { goTo } from "@/world/director";

/** Scene 04 — inside the cottage: a way back out, and a quiet nudge towards the table. */
export function CottagePanel() {
  const phase = useNavigation((s) => s.phase);
  const transitioning = useNavigation((s) => s.transitioning);
  const read = useWorld((s) => !!s.touched["letter"]);
  const show = phase === "cottage" && !transitioning;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="cottage"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <button
            onClick={() => goTo("garden")}
            className="pointer-events-auto absolute left-3 top-14 flex items-center gap-1 rounded-full px-3 py-2 font-ui text-[0.76rem] text-[var(--ink)] opacity-85 [text-shadow:var(--shadow)] transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70 sm:left-6 sm:top-16"
          >
            <ChevronLeft size={15} strokeWidth={1.6} />
            Step back outside
          </button>
          <motion.p
            className="absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] px-8 text-center font-display text-[1.5rem] italic text-[var(--ink)] [text-shadow:var(--shadow-strong)] sm:text-[1.8rem]"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 1.4, delay: 0.6 } }}
          >
            {read ? "Stay as long as you like." : "Something is waiting for you on the table."}
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
