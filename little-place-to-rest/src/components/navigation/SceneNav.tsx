"use client";

import { Flower2, House, Waves } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type Destination, destinationOf, useNavigation } from "@/state/navigation";
import { goTo } from "@/world/director";

const places: { id: Destination; label: string; Icon: typeof Flower2 }[] = [
  { id: "garden", label: "Garden", Icon: Flower2 },
  { id: "pond", label: "Pond", Icon: Waves },
  { id: "cottage", label: "Cottage", Icon: House },
];

/** Small, quiet way-finding. Only lists places that actually exist. */
export function SceneNav() {
  const phase = useNavigation((s) => s.phase);
  const transitioning = useNavigation((s) => s.transitioning);
  const current = destinationOf(phase);
  const show = current !== null && phase !== "letter";

  return (
    <AnimatePresence>
      {show && (
        <motion.nav
          key="nav"
          aria-label="Places"
          className="pointer-events-auto absolute right-4 top-4 flex items-center gap-1 sm:right-7 sm:top-6"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 1.2, delay: 0.6 } }}
          exit={{ opacity: 0 }}
        >
          {places.map(({ id, label, Icon }) => {
            const active = current === id;
            return (
              <button
                key={id}
                onClick={() => goTo(id)}
                disabled={transitioning || active}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 font-ui text-[0.74rem] tracking-[0.08em] text-[var(--ink)] [text-shadow:var(--shadow)] transition duration-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ink)]/70 ${
                  active ? "bg-[var(--ink)]/18 opacity-100" : "opacity-75 hover:bg-[var(--ink)]/10 hover:opacity-100"
                } disabled:cursor-default`}
              >
                <Icon size={14} strokeWidth={1.6} className="drop-shadow-[0_1px_6px_rgba(70,42,40,0.5)]" />
                {label}
              </button>
            );
          })}
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
