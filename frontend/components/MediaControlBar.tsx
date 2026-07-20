"use client";

import type { Step } from "@/lib/types";

const RATES = [0.5, 1, 2];

function IconVolume() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

// Nominal per-step weight so the readout looks like a real M:SS timecode --
// there's no audio/video file behind this, so this is a position readout
// (which step you're on), not elapsed time.
const SEC_PER_STEP = 60;

function fmt(stepIndex: number): string {
  const totalSec = Math.max(0, stepIndex) * SEC_PER_STEP;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  steps: Step[];
  activeIndex: number;
  onJump: (index: number) => void;
  playbackRate: number;
  onCycleRate: () => void;
  captionsOn: boolean;
  onToggleCaptions: () => void;
}

export default function MediaControlBar({
  steps, activeIndex, onJump, playbackRate, onCycleRate, captionsOn, onToggleCaptions,
}: Props) {
  const lastIndex = Math.max(0, steps.length - 1);

  return (
    <div className="flex h-9 shrink-0 items-center gap-4 bg-black px-4 text-xs text-gray-200">
      {/* Left: volume (decorative -- no audio source) + timecode */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          className="text-gray-400 cursor-default"
          title="No audio track for this session"
          disabled
        >
          <IconVolume />
        </button>
        <span className="tabular-nums text-gray-300 whitespace-nowrap text-[11px]">
          {fmt(activeIndex)}/{fmt(lastIndex)}
        </span>
      </div>

      {/* Center: progress / step scrubber */}
      <input
        type="range"
        min={0}
        max={lastIndex}
        value={Math.min(activeIndex, lastIndex)}
        disabled={steps.length === 0}
        onChange={(e) => onJump(Number(e.target.value))}
        className="scrubber flex-1"
      />

      {/* Right: playback speed + captions */}
      <div className="flex items-center gap-3 shrink-0 text-[11px]">
        <button
          onClick={onToggleCaptions}
          title="Toggle instruction captions on image cards"
          className={`transition-colors ${captionsOn ? "text-white" : "text-gray-500 hover:text-gray-300"}`}
        >
          CC
        </button>
        <button
          onClick={onCycleRate}
          title="Cycle auto-advance speed"
          className="text-gray-200 hover:text-white transition-colors"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}

export { RATES };
