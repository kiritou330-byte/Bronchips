"use client";

import { Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { music } from "@/config/audio.config";
import { seek, syncVolume, toggle } from "@/lib/audio/engine";
import { useAudio } from "@/state/audio";
import { audioMeter } from "@/world/environment/AudioReactive";

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

/** Four tiny bars that move with the music (driven by rAF, not React state). */
function Bars({ playing }: { playing: boolean }) {
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const t = performance.now() / 1000;
      bars.current.forEach((b, i) => {
        if (!b) return;
        const lvl = playing ? 0.25 + audioMeter.level * 0.75 : 0.18;
        const wob = playing ? 0.5 + 0.5 * Math.sin(t * (5 + i * 1.7) + i) : 0.5;
        b.style.transform = `scaleY(${Math.max(0.15, lvl * (0.45 + wob * 0.55))})`;
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return (
    <span className="flex h-3.5 items-end gap-[2px]" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          ref={(el) => {
            bars.current[i] = el;
          }}
          className="h-full w-[2.5px] origin-bottom rounded-full bg-[var(--ink)] transition-transform duration-100"
        />
      ))}
    </span>
  );
}

/** Minimal floating player: one quiet button, details on demand. Hidden if there's no song. */
export function MusicPlayer() {
  const { availability, playing, volume, muted, currentTime, duration, setVolume, setMuted } = useAudio();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => syncVolume(), [volume, muted]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (panel.current && !panel.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (availability !== "available") return null;
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div ref={panel} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Music"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--ink)] transition hover:bg-[var(--ink)]/12 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70"
      >
        {playing ? <Bars playing /> : <Music2 size={16} strokeWidth={1.6} className="drop-shadow-[0_1px_6px_rgba(70,42,40,0.5)]" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-11 w-[16.5rem] rounded-2xl border border-[var(--ink)]/15 bg-[rgba(46,32,38,0.55)] p-4 text-[var(--ink)] shadow-[0_20px_50px_-20px_rgba(20,10,15,0.6)] backdrop-blur-md"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 0.61, 0.36, 1] } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ink)]/90 text-[#3B2C2E] transition hover:bg-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ink)]/60"
              >
                {playing ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} className="translate-x-[1px]" />}
              </button>
              <div className="min-w-0">
                <p className="truncate font-display text-[1.05rem] italic leading-tight">{music.title}</p>
                <p className="truncate font-ui text-[0.7rem] text-[var(--ink-soft)]">{music.artist}</p>
              </div>
            </div>

            <div className="mt-4">
              <div
                role="slider"
                aria-label="Song position"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration)}
                aria-valuenow={Math.round(currentTime)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (!duration) return;
                  if (e.key === "ArrowRight") seek(Math.min(1, progress + 5 / duration));
                  if (e.key === "ArrowLeft") seek(Math.max(0, progress - 5 / duration));
                }}
                onPointerDown={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  seek((e.clientX - r.left) / r.width);
                }}
                className="group relative h-4 cursor-pointer focus-visible:outline-none"
              >
                <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--ink)]/20" />
                <div
                  className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--ink)]/85"
                  style={{ width: `${progress * 100}%` }}
                />
                <div
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--ink)] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                  style={{ left: `${progress * 100}%` }}
                />
              </div>
              <div className="mt-0.5 flex justify-between font-ui text-[0.66rem] tabular-nums text-[var(--ink-soft)]">
                <span>{fmt(currentTime)}</span>
                <span>{fmt(duration)}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <button
                onClick={() => setMuted(!muted)}
                aria-label={muted ? "Unmute" : "Mute"}
                className="rounded-full p-1 transition hover:bg-[var(--ink)]/12 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70"
              >
                {muted || volume === 0 ? <VolumeX size={15} strokeWidth={1.6} /> : <Volume2 size={15} strokeWidth={1.6} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (muted) setMuted(false);
                }}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--ink)]/25 accent-[var(--ink)]"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
