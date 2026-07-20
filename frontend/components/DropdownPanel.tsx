"use client";

import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Animated absolutely-positioned dropdown/menu panel. Replaces the
 * previous `animate-in fade-in slide-in-from-top-2 duration-150` classes,
 * which silently did nothing -- those are tailwindcss-animate utilities
 * and that plugin was never installed, so only the bare `animate-in`
 * keyframe (defined locally in tailwind.config.ts) was ever actually
 * applying.
 */
export default function DropdownPanel({ open, children, className = "" }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.12 } }}
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
