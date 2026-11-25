"use client";

import { Music2 } from "lucide-react";
import { motion } from "motion/react";
import { messages } from "@/config/messages.config";
import { play } from "@/lib/audio/engine";
import { useAudio } from "@/state/audio";
import { useWorld } from "@/state/world";
import { enterWorld } from "@/world/director";

const ease = [0.22, 0.61, 0.36, 1] as const;

function reveal(delay: number, reduced: boolean) {
  return {
    initial: { opacity: 0, y: reduced ? 0 : 14, filter: reduced ? "none" : "blur(8px)" },
    animate: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: reduced ? 0.6 : 1.8, delay: reduced ? delay * 0.3 : delay, ease },
    },
  };
}

/** Scene 01 — The Arrival: greeting over the cinematic approach, then the invitation to enter. */
export function ArrivalOverlay() {
  const reduced = useWorld((s) => s.reducedMotion);
  const availability = useAudio((s) => s.availability);
  const wantsMusic = useAudio((s) => s.wantsMusic);
  const setWantsMusic = useAudio((s) => s.setWantsMusic);
  const t = messages.arrival;

  const onEnter = () => {
    if (availability === "available" && wantsMusic) play();
    enterWorld();
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-end justify-center px-6 pb-[max(10vh,env(safe-area-inset-bottom))] sm:items-center sm:justify-start sm:px-[8vw] sm:pb-0"
      exit={{ opacity: 0, y: -10, filter: "blur(6px)", transition: { duration: 1.1, ease } }}
    >
      {/* A whisper of shade behind the text for legibility — not a card. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_95%,rgba(48,32,40,0.38),transparent_62%)] sm:bg-[radial-gradient(ellipse_at_18%_55%,rgba(48,32,40,0.32),transparent_55%)]" />

      <div className="relative w-full max-w-[34rem] text-center text-[var(--ink)] sm:text-left">
        <motion.h1
          {...reveal(2.4, reduced)}
          className="font-display text-[3.1rem] font-medium italic leading-[1.02] [text-shadow:var(--shadow)] sm:text-[4.6rem]"
        >
          {t.greeting}
        </motion.h1>
        <motion.p
          {...reveal(3.5, reduced)}
          className="mt-3 font-display text-[1.45rem] leading-snug [text-shadow:var(--shadow)] sm:text-[1.9rem]"
        >
          {t.welcome}
        </motion.p>
        <motion.p
          {...reveal(4.8, reduced)}
          className="mx-auto mt-4 max-w-[26rem] font-ui text-[0.92rem] leading-relaxed text-[var(--ink-soft)] [text-shadow:var(--shadow)] sm:mx-0 sm:text-[1rem]"
        >
          {t.subtext}
        </motion.p>

        <motion.div
          {...reveal(6.2, reduced)}
          className="pointer-events-auto mt-8 flex flex-col items-center gap-4 sm:items-start"
        >
          <button
            onClick={onEnter}
            className="group relative rounded-full border border-[var(--ink)]/55 bg-[var(--ink)]/10 px-8 py-3.5 font-ui text-[0.82rem] font-medium uppercase tracking-[0.22em] text-[var(--ink)] backdrop-blur-[2px] transition duration-500 hover:border-[var(--ink)] hover:bg-[var(--ink)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/70"
          >
            <span className="absolute inset-0 -z-10 rounded-full bg-[var(--glow)] opacity-0 blur-xl transition duration-700 group-hover:opacity-60" />
            {t.cta}
          </button>

          {availability === "available" && (
            <button
              onClick={() => setWantsMusic(!wantsMusic)}
              role="switch"
              aria-checked={wantsMusic}
              className="flex items-center gap-2.5 rounded-full px-3 py-1.5 font-ui text-[0.8rem] text-[var(--ink-soft)] transition hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/60"
            >
              <span
                className={`relative inline-flex h-4 w-7 items-center rounded-full border border-[var(--ink)]/60 transition ${wantsMusic ? "bg-[var(--ink)]/45" : "bg-transparent"}`}
              >
                <span
                  className={`absolute h-2.5 w-2.5 rounded-full bg-[var(--ink)] transition-all duration-300 ${wantsMusic ? "left-[14px]" : "left-[3px]"}`}
                />
              </span>
              <Music2 size={14} strokeWidth={1.6} />
              {t.music}
            </button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
