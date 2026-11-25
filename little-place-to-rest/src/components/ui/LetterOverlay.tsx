"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { letter } from "@/config/letter.config";
import { useNavigation } from "@/state/navigation";
import { useWorld } from "@/state/world";
import { closeLetter } from "@/world/director";

const ease = [0.22, 0.61, 0.36, 1] as const;

// Paper grain as an inline SVG (no image download).
const grain =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.28  0 0 0 0.09 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Scene 05 — the letter itself, as a real page: crisp, readable, and easy to close. */
export function LetterOverlay() {
  const open = useNavigation((s) => s.letterOpen);
  const reduced = useWorld((s) => s.reducedMotion);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const paragraphs = letter.body.split(/\n\s*\n/);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeLetter();
    window.addEventListener("keydown", onKey);
    const id = setTimeout(() => closeBtn.current?.focus({ preventScroll: true }), 600);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(id);
    };
  }, [open]);

  const step = reduced ? 0.08 : 0.42;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="letter"
          role="dialog"
          aria-modal="true"
          aria-label="A letter for you"
          className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-[rgba(36,24,26,0.42)] px-4 py-6 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.9 } }}
          exit={{ opacity: 0, transition: { duration: 0.8 } }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLetter();
          }}
        >
          <motion.article
            className="relative max-h-[76dvh] w-full max-w-[31rem] overflow-y-auto rounded-[3px] bg-[#FBF5E8] px-7 py-9 text-[#3E302C] shadow-[0_30px_80px_-24px_rgba(40,24,20,0.65),0_2px_0_rgba(255,255,255,0.6)_inset] sm:px-11 sm:py-12"
            style={{ backgroundImage: grain }}
            initial={{ opacity: 0, y: reduced ? 0 : 40, rotate: reduced ? 0 : -1.6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, rotate: -0.5, scale: 1, transition: { duration: reduced ? 0.4 : 1.3, ease } }}
            exit={{ opacity: 0, y: reduced ? 0 : 24, transition: { duration: 0.6 } }}
          >
            <motion.p
              className="font-display text-[1.7rem] italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.6, duration: 1.2 } }}
            >
              {letter.salutation}
            </motion.p>
            {paragraphs.map((p, i) => (
              <motion.p
                key={i}
                className="mt-4 whitespace-pre-line font-display text-[1.18rem] leading-[1.6] sm:text-[1.25rem]"
                initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 1.0 + i * step, duration: 1.2, ease } }}
              >
                {p}
              </motion.p>
            ))}
            <motion.p
              className="mt-7 font-display text-[1.35rem] italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 1.2 + paragraphs.length * step, duration: 1.4 } }}
            >
              {letter.closing}
            </motion.p>
          </motion.article>

          <motion.button
            ref={closeBtn}
            onClick={closeLetter}
            className="mt-6 rounded-full border border-[var(--ink)]/60 bg-[var(--ink)]/10 px-6 py-2.5 font-ui text-[0.78rem] uppercase tracking-[0.18em] text-[var(--ink)] [text-shadow:var(--shadow)] transition hover:bg-[var(--ink)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.4, duration: 1 } }}
          >
            {letter.closeLabel}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
