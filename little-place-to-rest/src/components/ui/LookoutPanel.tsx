"use client";

import { ChevronLeft, Moon, Sun, Sunrise } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { atmospheres, type TimeOfDay } from "@/config/world.config";
import { useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";
import { goTo } from "@/world/director";

const times: { id: TimeOfDay; Icon: typeof Sun }[] = [
  { id: "morning", Icon: Sunrise },
  { id: "golden", Icon: Sun },
  { id: "night", Icon: Moon },
];

/** Scene 07 — "Stay a little longer." Watch the sky; change the hour, slowly. */
export function LookoutPanel() {
  const phase = useNavigation((s) => s.phase);
  const transitioning = useNavigation((s) => s.transitioning);
  const time = useWorld((s) => s.timeOfDay);
  const setTime = useWorld((s) => s.setTimeOfDay);
  const show = phase === "lookout" && !transitioning;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="lookout"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.4 } }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
        >
          <button
            onClick={() => goTo("garden")}
            className="pointer-events-auto absolute left-3 top-14 flex items-center gap-1 rounded-full px-3 py-2 font-ui text-[0.76rem] text-[var(--ink)] opacity-85 [text-shadow:var(--shadow)] transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70 sm:left-6 sm:top-16"
          >
            <ChevronLeft size={15} strokeWidth={1.6} />
            Back to the garden
          </button>
          <div className="absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col items-center px-6 text-center text-[var(--ink)]">
            <div className="pointer-events-none absolute inset-x-0 -bottom-10 -z-10 h-56 bg-[radial-gradient(ellipse_at_50%_100%,rgba(40,28,36,0.4),transparent_70%)]" />
            <p className="font-display text-[2rem] italic leading-tight [text-shadow:var(--shadow-strong)] sm:text-[2.4rem]">
              Stay a little longer.
            </p>
            <p className="mt-2 font-ui text-[0.85rem] text-[var(--ink-soft)] [text-shadow:var(--shadow)]">
              The sky is in no hurry. Neither are you.
            </p>
            <div role="radiogroup" aria-label="Time of day" className="pointer-events-auto mt-5 flex gap-1.5 rounded-full border border-[var(--ink)]/35 bg-[var(--ink)]/8 p-1">
              {times.map(({ id, Icon }) => {
                const active = time === id;
                return (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTime(id)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 font-ui text-[0.76rem] tracking-wide transition duration-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70 ${
                      active ? "bg-[var(--ink)]/25" : "opacity-80 hover:bg-[var(--ink)]/12 hover:opacity-100"
                    }`}
                  >
                    <Icon size={14} strokeWidth={1.6} />
                    {atmospheres[id].label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
