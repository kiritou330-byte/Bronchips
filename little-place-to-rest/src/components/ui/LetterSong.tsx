"use client";

import { Play } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { letter } from "@/config/letter.config";
import { pause } from "@/lib/audio/engine";

/**
 * The closing song of the letter. Nothing loads from YouTube until it's tapped
 * (no third-party requests before that). Tapping pauses the background music so
 * the two never overlap, then shows YouTube's own player (kept ≥ 200 px tall).
 */
export function LetterSong({ delay }: { delay: number }) {
  const song = letter.song;
  const [started, setStarted] = useState(false);
  const player = useRef<HTMLDivElement>(null);
  // Bring the player fully into view inside the scrolling letter once it appears.
  useEffect(() => {
    if (started) player.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [started]);
  if (!song) return null;

  const src = `https://www.youtube-nocookie.com/embed/${song.youtubeId}?autoplay=1&playsinline=1&rel=0`;

  return (
    <motion.div
      className="mt-8 border-t border-[#3E302C]/15 pt-6"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { delay, duration: 1.4 } }}
    >
      <p className="font-display text-[1.15rem] italic text-[#3E302C]/80">{song.label}</p>
      {started ? (
        <div ref={player} className="mt-3 aspect-video min-h-[200px] w-full scroll-mb-4 overflow-hidden rounded-md bg-black">
          <iframe
            className="h-full w-full"
            src={src}
            title={`${song.title} — ${song.artist}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      ) : (
        <button
          onClick={() => {
            pause();
            setStarted(true);
          }}
          className="group mt-3 flex w-full items-center gap-4 rounded-md border border-[#3E302C]/20 bg-[#F4EAD8] px-4 py-3.5 text-left transition hover:border-[#3E302C]/40 hover:bg-[#EFE2CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E302C]/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#3E302C] text-[#FBF5E8] transition group-hover:scale-105">
            <Play size={17} strokeWidth={2} className="translate-x-[1px]" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[1.3rem] leading-tight">{song.title}</span>
            <span className="block font-ui text-[0.75rem] text-[#3E302C]/65">{song.artist} · plays on YouTube</span>
          </span>
        </button>
      )}
    </motion.div>
  );
}
