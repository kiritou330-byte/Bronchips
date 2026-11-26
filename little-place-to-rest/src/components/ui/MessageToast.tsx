"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useWorld } from "@/state/world";

/** Short messages from the world (flowers, clouds...). They arrive softly and leave on their own. */
export function MessageToast() {
  const message = useWorld((s) => s.message);
  const clear = useWorld((s) => s.clearMessage);

  useEffect(() => {
    if (!message) return;
    const words = message.text.split(" ").length;
    const id = setTimeout(() => clear(message.id), 3200 + words * 260);
    return () => clearTimeout(id);
  }, [message, clear]);

  return (
    <div className="absolute inset-x-0 top-[22%] flex justify-center px-8 sm:top-[18%]">
      <AnimatePresence mode="wait">
        {message && (
          <motion.p
            key={message.id}
            role="status"
            className="max-w-[22rem] text-center font-display text-[1.65rem] italic leading-snug text-[var(--ink)] [text-shadow:var(--shadow-strong)] sm:max-w-[30rem] sm:text-[2.1rem]"
            initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.3, ease: [0.22, 0.61, 0.36, 1] } }}
            exit={{ opacity: 0, y: -8, filter: "blur(8px)", transition: { duration: 1.0 } }}
          >
            {message.text}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
