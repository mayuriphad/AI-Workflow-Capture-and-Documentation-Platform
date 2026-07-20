"use client";

import { api } from "@/lib/api";
import type { Step } from "@/lib/types";

function IconText() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="14" y2="18" />
    </svg>
  );
}

function IconPicture() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

interface Props {
  steps: Step[];
  activeIndex?: number;
  onJump: (index: number) => void;
}

/**
 * A grid of every captured/inserted step (text and image alike) that reads
 * as both the recording's timeline and the SOP's outline at once.
 * Pending-review frames (flagged sensitive, not yet in the Word doc) get an
 * amber badge; each tile is labeled by its real kind and overall position
 * ("Text 1", "Img 2", "Text 3", ...).
 */
export default function Filmstrip({ steps, activeIndex, onJump }: Props) {
  if (steps.length === 0) {
    return (
      <div className="w-48 shrink-0 rounded-lg border border-dashed border-line p-4 text-sm text-ink/40">
        Captured frames will line up here as you record.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((step, idx) => {
        const isImage = step.kind === "screenshot_step";
        const path = step.screenshot_final_path ?? step.screenshot_raw_path;
        const pending = step.review_status === "pending_review";
        const active = idx === activeIndex;
        return (
          <button
            key={step.id}
            onClick={() => onJump(idx)}
            className={`relative flex flex-col items-center justify-center gap-1 aspect-square rounded border bg-white hover:bg-gray-50 transition-colors overflow-hidden p-1.5 ${
              active ? "border-accent ring-1 ring-accent/40" : "border-gray-300"
            }`}
          >
            {isImage && path ? (
              <div className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={api.screenshotUrl(relativeScreenshotPath(path, step.project_id))}
                  alt={`Frame ${idx + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] py-0.5">
                  Img {idx + 1}
                </span>
              </div>
            ) : (
              <>
                {isImage ? <IconPicture /> : <IconText />}
                <span className="text-[9px] leading-tight text-ink/60 text-center">
                  {isImage ? "Img" : "Text"} {idx + 1}
                </span>
              </>
            )}
            {pending && (
              <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// screenshot_raw_path/screenshot_final_path are absolute filesystem paths
// (backend-side); the static mount only serves paths relative to
// SCREENSHOTS_DIR, i.e. "{project_id}/{filename}".
function relativeScreenshotPath(fullPath: string, projectId: string): string {
  const filename = fullPath.split(/[\\/]/).pop();
  return `${projectId}/${filename}`;
}
