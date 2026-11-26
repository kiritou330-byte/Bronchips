"use client";

import { ChevronLeft, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { breathAt, useBreathing } from "@/state/breathing";
import { useNavigation } from "@/state/navigation";
import { goTo } from "@/world/director";

const ease = [0.22, 0.61, 0.36, 1] as const;
const options: { label: string; duration: number | null }[] = [
  { label: "30 seconds", duration: 30 },
  { label: "1 minute", duration: 60 },
  { label: "As long as I like", duration: null },
];

function useBreathCue() {
  const active = useBreathing((s) => s.active);
  const startedAt = useBreathing((s) => s.startedAt);
  const duration = useBreathing((s) => s.duration);
  const [cue, setCue] = useState<{ phase: "in" | "out"; left: number | null }>({ phase: "in", left: null });
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() / 1000 - startedAt;
      const s = breathAt(elapsed);
      const left = duration === null ? null : Math.max(0, Math.ceil(duration - elapsed));
      setCue((c) => (c.phase !== s.phase || c.left !== left ? { phase: s.phase, left } : c));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [active, startedAt, duration]);
  return cue;
}

/** Scene 03 — "Take a little breath." Calm choices, a soft cue, and a way out at every moment. */
export function BreathingPanel() {
  const phase = useNavigation((s) => s.phase);
  const transitioning = useNavigation((s) => s.transitioning);
  const { active, finished, start, stop, clearFinished } = useBreathing();
  const cue = useBreathCue();
  const show = phase === "pond" && !transitioning;

  useEffect(() => {
    if (!finished) return;
    const id = setTimeout(clearFinished, 5200);
    return () => clearTimeout(id);
  }, [finished, clearFinished]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="breath"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
        >
          <button
            onClick={() => goTo("garden")}
            className="pointer-events-auto absolute left-3 top-14 flex items-center gap-1 rounded-full px-3 py-2 font-ui text-[0.76rem] text-[var(--ink)] opacity-85 [text-shadow:var(--shadow)] transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70 sm:left-6 sm:top-16"
          >
            <ChevronLeft size={15} strokeWidth={1.6} />
            Back to the garden
          </button>

          <div className="absolute inset-x-0 bottom-[max(2.5rem,env(safe-area-inset-bottom))] flex flex-col items-center px-6 text-center text-[var(--ink)]">
            <div className="pointer-events-none absolute inset-x-0 -bottom-10 -z-10 h-64 bg-[radial-gradient(ellipse_at_50%_100%,rgba(40,28,36,0.42),transparent_70%)]" />
            <AnimatePresence mode="wait">
              {active ? (
                <motion.div
                  key="active"
                  className="flex flex-col items-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { duration: 1 } }}
                  exit={{ opacity: 0, transition: { duration: 0.6 } }}
                >
                  <div className="relative h-14 w-[18rem]">
                    <AnimatePresence mode="sync">
                      <motion.p
                        key={cue.phase}
                        className="absolute inset-0 font-display text-[2.1rem] italic [text-shadow:var(--shadow-strong)] sm:text-[2.5rem]"
                        initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.4, ease } }}
                        exit={{ opacity: 0, y: -6, filter: "blur(6px)", transition: { duration: 1.0 } }}
                      >
                        {cue.phase === "in" ? "Breathe in slowly…" : "…and let it out."}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                  <div className="mt-4 flex items-center gap-4 font-ui text-[0.78rem] text-[var(--ink-soft)] [text-shadow:var(--shadow)]">
                    {cue.left !== null && <span className="tabular-nums">{cue.left}s</span>}
                    <button
                      onClick={stop}
                      className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[var(--ink)]/45 px-4 py-2 transition hover:border-[var(--ink)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70"
                    >
                      <X size={13} strokeWidth={1.8} />
                      Stop
                    </button>
                  </div>
                </motion.div>
              ) : finished ? (
                <motion.p
                  key="done"
                  className="font-display text-[1.9rem] italic [text-shadow:var(--shadow-strong)]"
                  initial={{ opacity: 0, filter: "blur(6px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 1.4 } }}
                  exit={{ opacity: 0, transition: { duration: 0.8 } }}
                >
                  That&apos;s all. You did well.
                </motion.p>
              ) : (
                <motion.div
                  key="choose"
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 1.2, ease } }}
                  exit={{ opacity: 0, transition: { duration: 0.5 } }}
                >
                  <p className="font-display text-[2rem] italic leading-tight [text-shadow:var(--shadow-strong)] sm:text-[2.4rem]">
                    Take a little breath.
                  </p>
                  <p className="mt-2 font-ui text-[0.85rem] text-[var(--ink-soft)] [text-shadow:var(--shadow)]">
                    Follow the light. There&apos;s no right way to do it.
                  </p>
                  <div className="pointer-events-auto mt-5 flex flex-wrap justify-center gap-2">
                    {options.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => start(o.duration)}
                        className="rounded-full border border-[var(--ink)]/45 bg-[var(--ink)]/8 px-4 py-2 font-ui text-[0.78rem] tracking-wide transition duration-500 hover:border-[var(--ink)] hover:bg-[var(--ink)]/18 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70"
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
