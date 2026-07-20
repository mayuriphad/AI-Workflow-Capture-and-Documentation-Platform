"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Project, Step } from "@/lib/types";
import DropdownPanel from "./DropdownPanel";
import { PublishDropdown } from "./Navbar";
import ToolTabsNav from "./ToolTabsNav";

const PILL = "rounded border border-white/25 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-white/10 transition-colors whitespace-nowrap";

function IconRecordDot() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function IconStopSquare() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function IconRewind() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <polygon points="11 19 2 12 11 5 11 19" /><polygon points="22 19 13 12 22 5 22 19" />
    </svg>
  );
}
function IconFastForward() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <polygon points="13 19 22 12 13 5 13 19" /><polygon points="2 19 11 12 2 5 2 19" />
    </svg>
  );
}
function IconPlay() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}
function IconPause() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
function IconMute() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
function IconFlag() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function IconHelp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconMinimize() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);
  return ref;
}

interface Props {
  project: Project;
  steps: Step[];
  pendingSteps: Step[];
  activeIndex: number;
  onJump: (index: number) => void;
  autoPlaying: boolean;
  onToggleAutoPlay: () => void;
  autoAdvanceSec: number;
  processing: boolean;
  compact: boolean;
  onToggleCompact: () => void;
  onOpenPending: (stepId: string) => void;
  recording: boolean;
  onToggleRecording: () => void;
  recordingBusy: boolean;
}

export default function SessionTopBar({
  project, steps, pendingSteps, activeIndex, onJump, autoPlaying, onToggleAutoPlay, autoAdvanceSec, processing, compact, onToggleCompact, onOpenPending,
  recording, onToggleRecording, recordingBusy,
}: Props) {
  const router = useRouter();
  const [infoOpen, setInfoOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [pendingOpen, setPendingOpen] = useState(false);
  const infoRef = useOutsideClose(() => setInfoOpen(false));
  const helpRef = useOutsideClose(() => setHelpOpen(false));
  const pendingRef = useOutsideClose(() => setPendingOpen(false));

  const activeStep = steps[activeIndex];
  const activeLabel = activeStep
    ? `${activeStep.kind === "screenshot_step" ? "Img" : "Text"} ${activeIndex + 1}`
    : "—";

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < steps.length - 1;

  return (
    <div className="flex shrink-0 flex-col bg-[#26343B] text-gray-300 border-b border-black/40">
      {/* Row A: tool tabs + window icons */}
      <div className="flex h-9 items-center justify-between px-3 border-b border-white/10">
        <ToolTabsNav />

        <div className="flex h-full shrink-0 items-center gap-3.5">
          <div className="relative" ref={pendingRef}>
            <button onClick={() => setPendingOpen((o) => !o)} className="relative text-gray-300 hover:text-white transition-colors" title="Pending redaction review">
              <IconFlag />
              {pendingSteps.length > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                  {pendingSteps.length}
                </span>
              )}
            </button>
            <DropdownPanel open={pendingOpen} className="absolute right-0 top-7 w-72 rounded bg-[#2D2D2D] border border-gray-700 shadow-xl overflow-hidden z-50 text-xs">
              <div className="px-3.5 py-2.5 border-b border-gray-700 text-white font-semibold">
                {pendingSteps.length === 0 ? "Nothing pending" : `${pendingSteps.length} waiting for redaction review`}
              </div>
              {pendingSteps.length > 0 && (
                <div className="max-h-56 overflow-y-auto">
                  {pendingSteps.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { onOpenPending(s.id); setPendingOpen(false); }}
                      className="flex w-full items-center px-3.5 py-2 text-left text-gray-300 hover:bg-white/5 hover:text-white transition-colors truncate"
                    >
                      {s.instruction || "Untitled step"}
                    </button>
                  ))}
                </div>
              )}
            </DropdownPanel>
          </div>
          <div className="relative" ref={infoRef}>
            <button onClick={() => setInfoOpen((o) => !o)} className="text-gray-300 hover:text-white transition-colors" title="Info">
              <IconInfo />
            </button>
            <DropdownPanel open={infoOpen} className="absolute right-0 top-7 w-72 rounded bg-[#2D2D2D] border border-gray-700 shadow-xl overflow-hidden z-50 text-xs">
              <div className="px-3.5 py-2.5 border-b border-gray-700 text-white font-semibold">{project.title}</div>
              <div className="px-3.5 py-2.5 space-y-1.5 text-gray-400">
                <p className="truncate" title={project.word_file_path}>Document: {project.word_file_path}</p>
                <p>Steps: {project.steps.length}</p>
                <p>Status: {project.status}</p>
              </div>
            </DropdownPanel>
          </div>
          <div className="relative" ref={helpRef}>
            <button onClick={() => setHelpOpen((o) => !o)} className="text-gray-300 hover:text-white transition-colors" title="Help">
              <IconHelp />
            </button>
            <DropdownPanel open={helpOpen} className="absolute right-0 top-7 w-64 rounded bg-[#2D2D2D] border border-gray-700 shadow-xl overflow-hidden z-50 text-xs">
              <div className="px-3.5 py-2.5 border-b border-gray-700 text-white font-semibold">Quick tips</div>
              <ul className="px-3.5 py-2.5 space-y-1.5 text-gray-400 list-disc list-inside">
                <li>Click a sidebar tile or drag the footer slider to jump between steps</li>
                <li>Use the pencil icon on a card to edit its text or image</li>
                <li>Word is genuinely open — edits there sync automatically</li>
              </ul>
            </DropdownPanel>
          </div>
          <Link href="/settings" className="text-gray-300 hover:text-white transition-colors" title="Settings">
            <IconSettings />
          </Link>
          <button onClick={onToggleCompact} className={`transition-colors ${compact ? "text-white" : "text-gray-300 hover:text-white"}`} title={compact ? "Expand toolbar" : "Minimize toolbar"}>
            <IconMinimize />
          </button>
          <button onClick={() => router.push("/stories")} className="rounded px-1.5 py-0.5 text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-colors" title="Close story">
            <IconX />
          </button>
        </div>
      </div>

      {/* Row B: project title, status, media controls, export */}
      <div className="flex h-10 items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/stories")} className="flex items-center gap-1.5 text-sm font-medium text-white hover:text-gray-200 transition-colors">
            <IconChevronLeft />
            {project.title}
          </button>
          <button
            onClick={onToggleRecording}
            disabled={recordingBusy}
            title={recording ? "Stop recording this session" : "Resume recording"}
            className={`flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              recording ? "bg-red-500/15 text-red-300 hover:bg-red-500/25" : "bg-white/10 text-gray-300 hover:bg-white/15"
            }`}
          >
            {recording ? <IconStopSquare /> : <IconRecordDot />}
            {recordingBusy ? "…" : recording ? "Stop Recording" : "Resume Recording"}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          <span>Currently On:</span>
          <span className="font-semibold text-white">{activeLabel}</span>
          {processing && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#5EC9C0] animate-pulse" title="Gemini is analyzing the latest screenshot" />}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => canPrev && onJump(activeIndex - 1)} disabled={!canPrev} className="text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Previous step">
              <IconRewind />
            </button>
            <button
              onClick={onToggleAutoPlay}
              disabled={steps.length < 2}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-500/60 text-white hover:bg-gray-500/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={autoPlaying ? "Pause" : "Auto-advance"}
            >
              {autoPlaying ? <IconPause /> : <IconPlay />}
            </button>
            <button onClick={() => canNext && onJump(activeIndex + 1)} disabled={!canNext} className="text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed" title="Next step">
              <IconFastForward />
            </button>
            <span className="text-[11px] text-gray-300 whitespace-nowrap">Play : {autoAdvanceSec} Secs</span>
            <IconMute />
          </div>

          <div className="h-4 w-px bg-white/15" />

          <div className="flex items-center gap-1.5">
            <a href={api.exportUrl(project.id, "docx")} target="_blank" rel="noreferrer" className={PILL}>
              View
            </a>
            <PublishDropdown
              projectId={project.id}
              renderTrigger={(onClick, disabled) => (
                <button onClick={onClick} disabled={disabled} className={PILL}>
                  Publish Story
                </button>
              )}
            />
            <a href={api.exportUrl(project.id, "docx")} target="_blank" rel="noreferrer" className={`${PILL} text-orange-300`}>
              Word
            </a>
            <a href={api.exportUrl(project.id, "pdf")} target="_blank" rel="noreferrer" className={`${PILL} text-red-300`}>
              PDF
            </a>
            <a href={api.exportUrl(project.id, "html")} target="_blank" rel="noreferrer" className={`${PILL} text-blue-300`}>
              HTML
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
