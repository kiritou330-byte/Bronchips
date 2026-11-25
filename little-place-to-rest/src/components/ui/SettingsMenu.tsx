"use client";

import { Settings2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { detectInitialQuality } from "@/config/quality.config";
import { useAudio } from "@/state/audio";
import { type Quality, useWorld } from "@/state/world";

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 rounded-lg py-1.5 text-left font-ui text-[0.78rem] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70"
    >
      {label}
      <span className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border border-[var(--ink)]/60 transition ${on ? "bg-[var(--ink)]/45" : ""}`}>
        <span className={`absolute h-2.5 w-2.5 rounded-full bg-[var(--ink)] transition-all duration-300 ${on ? "left-[14px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}

const levels: { id: Quality | "auto"; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

/** Small settings: visual quality, motion, and whether music touches the world. */
export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const quality = useWorld((s) => s.quality);
  const locked = useWorld((s) => s.qualityLocked);
  const reduced = useWorld((s) => s.reducedMotion);
  const reactive = useWorld((s) => s.reactive);
  const musicAvailable = useAudio((s) => s.availability === "available");

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickQuality = (id: Quality | "auto") => {
    if (id === "auto") useWorld.setState({ qualityLocked: false, quality: detectInitialQuality() });
    else useWorld.getState().setQuality(id, true);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[var(--ink)]/12 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70"
      >
        <Settings2 size={16} strokeWidth={1.6} className="drop-shadow-[0_1px_6px_rgba(70,42,40,0.5)]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-11 w-[15.5rem] rounded-2xl border border-[var(--ink)]/15 bg-[rgba(46,32,38,0.55)] p-4 text-[var(--ink)] shadow-[0_20px_50px_-20px_rgba(20,10,15,0.6)] backdrop-blur-md"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 0.61, 0.36, 1] } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}
          >
            <p className="font-ui text-[0.68rem] uppercase tracking-[0.16em] text-[var(--ink-soft)]">Visual quality</p>
            <div role="radiogroup" aria-label="Visual quality" className="mt-2 grid grid-cols-4 gap-1 rounded-full bg-[var(--ink)]/8 p-1">
              {levels.map((l) => {
                const active = l.id === "auto" ? !locked : locked && quality === l.id;
                return (
                  <button
                    key={l.id}
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickQuality(l.id)}
                    className={`rounded-full py-1.5 font-ui text-[0.7rem] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70 ${active ? "bg-[var(--ink)]/25" : "opacity-75 hover:opacity-100"}`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 border-t border-[var(--ink)]/12 pt-2">
              <Switch on={reduced} onChange={(v) => useWorld.getState().setReducedMotionOverride(v)} label="Reduce motion" />
              {musicAvailable && (
                <Switch on={reactive} onChange={(v) => useWorld.getState().setReactive(v)} label="Let the music move the world" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
