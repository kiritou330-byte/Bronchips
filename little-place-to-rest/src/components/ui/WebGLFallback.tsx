"use client";

import { letter } from "@/config/letter.config";
import { messages } from "@/config/messages.config";

/**
 * Shown only when the device has no WebGL. Keeps the heart of the experience — the greeting
 * and the letter — available, without pretending to be the 3D world.
 */
export function WebGLFallback() {
  const t = messages.arrival;
  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#7D8FBE_0%,#F7C99B_58%,#EBB892_100%)] px-6 py-16 text-[#3B2C2A]">
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-5xl italic text-[var(--ink)] [text-shadow:var(--shadow)]">{t.greeting}</h1>
        <p className="mt-3 font-display text-2xl text-[var(--ink)] [text-shadow:var(--shadow)]">{t.welcome}</p>
        <p className="mt-4 font-ui text-sm text-[var(--ink)]/90 [text-shadow:var(--shadow)]">{t.subtext}</p>
        <article className="mt-12 rounded-sm bg-[#FBF5E8] px-7 py-9 shadow-[0_20px_60px_-20px_rgba(60,40,30,0.45)]">
          <p className="font-display text-2xl italic">{letter.salutation}</p>
          {letter.body.split("\n\n").map((p, i) => (
            <p key={i} className="mt-4 whitespace-pre-line font-display text-[1.15rem] leading-relaxed">
              {p}
            </p>
          ))}
          <p className="mt-6 font-display text-xl italic">{letter.closing}</p>
        </article>
        <p className="mt-8 font-ui text-xs text-[var(--ink)]/80">
          This device can&apos;t show the 3D world, so here is the most important part.
        </p>
      </div>
    </main>
  );
}
