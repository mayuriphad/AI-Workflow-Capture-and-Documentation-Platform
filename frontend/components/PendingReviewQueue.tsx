"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import type { Step } from "@/lib/types";

const RedactionOverlay = dynamic(() => import("./RedactionOverlay"), { ssr: false });

interface Props {
  pending: Step[];
  onChange: () => void;
}

export default function PendingReviewQueue({ pending, onChange }: Props) {
  const [openStepId, setOpenStepId] = useState<string | null>(null);

  if (pending.length === 0) return null;

  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 p-4">
      <h3 className="mb-2 text-sm font-semibold text-orange-700">
        {pending.length} step{pending.length === 1 ? "" : "s"} waiting for redaction review
      </h3>
      <ul className="space-y-1">
        {pending.map((step) => (
          <li key={step.id} className="flex items-center justify-between text-sm">
            <span className="truncate text-ink/80">{step.instruction}</span>
            <button
              onClick={() => setOpenStepId(step.id)}
              className="ml-3 shrink-0 rounded border border-orange-400 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
            >
              Review
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {openStepId && (
          <RedactionOverlay
            stepId={openStepId}
            onDone={() => {
              setOpenStepId(null);
              onChange();
            }}
            onReject={() => {
              setOpenStepId(null);
              onChange();
            }}
            onClose={() => setOpenStepId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
