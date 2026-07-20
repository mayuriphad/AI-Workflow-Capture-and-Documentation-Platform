"use client";

import { motion } from "framer-motion";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}

/**
 * Shared animated modal shell -- backdrop fade + panel spring-in. Callers
 * must wrap their conditional render in <AnimatePresence> for the exit
 * animation to actually play (React unmounts synchronously otherwise).
 */
export default function Modal({ onClose, children, maxWidth = "max-w-lg" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full ${maxWidth} overflow-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#052659]`}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
