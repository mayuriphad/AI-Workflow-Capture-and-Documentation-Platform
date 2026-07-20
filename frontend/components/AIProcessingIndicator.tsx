"use client";

import { AnimatePresence, motion } from "framer-motion";

export default function AIProcessingIndicator({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -6, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -6, height: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2.5 overflow-hidden rounded-lg border border-[#5483B3]/30 bg-[#EBF5FF] px-4 py-2.5 text-sm text-[#052659] dark:border-[#5483B3]/30 dark:bg-white/5 dark:text-[#7DA0CA]"
        >
          <span className="relative flex h-2.5 w-2.5">
            <motion.span
              className="absolute inline-flex h-full w-full rounded-full bg-[#5483B3]"
              animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
            />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#5483B3]" />
          </span>
          <span className="font-medium">Gemini is analyzing the latest screenshot…</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
