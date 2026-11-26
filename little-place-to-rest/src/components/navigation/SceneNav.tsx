"use client";

import { Flower2, House, Sunset, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type Destination, destinationOf, useNavigation } from "@/state/navigation";
import { goTo } from "@/world/director";
import { MusicPlayer } from "../audio/MusicPlayer";
import { SettingsMenu } from "../ui/SettingsMenu";

const places: { id: Destination; label: string; Icon: typeof Flower2 }[] = [
  { id: "garden", label: "Garden", Icon: Flower2 },
  { id: "pond", label: "Pond", Icon: Waves },
  { id: "cottage", label: "Cottage", Icon: House },
  { id: "lookout", label: "Lookout", Icon: Sunset },
];

/**
 * Top-right cluster: music, settings and quiet way-finding between the places that exist.
 * Labels collapse to icons on narrow phones.
 */
export function SceneNav() {
  const phase = useNavigation((s) => s.phase);
  const transitioning = useNavigation((s) => s.transitioning);
  const current = destinationOf(phase);
  const show = current !== null && phase !== "letter";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="topbar"
          className="pointer-events-auto absolute right-2 top-3 flex items-center gap-0.5 sm:right-6 sm:top-5 sm:gap-1"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1.2, delay: 0.6 } }}
          exit={{ opacity: 0 }}
        >
          <MusicPlayer />
          <SettingsMenu />
          <span className="mx-1 h-4 w-px bg-[var(--ink)]/30" aria-hidden />
          <nav aria-label="Places" className="flex items-center gap-0.5 sm:gap-1">
            {places.map(({ id, label, Icon }) => {
              const active = current === id;
              return (
                <button
                  key={id}
                  onClick={() => goTo(id)}
                  disabled={transitioning || active}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-2 font-ui text-[0.74rem] tracking-[0.08em] text-[var(--ink)] [text-shadow:var(--shadow)] transition duration-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70 sm:px-3 ${
                    active ? "bg-[var(--ink)]/18 opacity-100" : "opacity-75 hover:bg-[var(--ink)]/10 hover:opacity-100"
                  } disabled:cursor-default`}
                >
                  <Icon size={15} strokeWidth={1.6} className="drop-shadow-[0_1px_6px_rgba(70,42,40,0.5)]" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
