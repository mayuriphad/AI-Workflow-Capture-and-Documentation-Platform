"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useSession } from "@/lib/SessionContext";
import { useToast } from "@/lib/ToastContext";
import PendingReviewQueue from "@/components/PendingReviewQueue";
import Filmstrip from "@/components/Filmstrip";
import StepCard from "@/components/StepCard";
import AddImageBetween from "@/components/AddImageBetween";
import AddSectionButton from "@/components/AddSectionButton";
import SessionTopBar from "@/components/SessionTopBar";
import MediaControlBar, { RATES } from "@/components/MediaControlBar";
import AIProcessingIndicator from "@/components/AIProcessingIndicator";

const BASE_AUTO_ADVANCE_SEC = 3;

function LoadingSkeleton() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-line/30" />
      <div className="h-12 animate-pulse rounded-lg border border-line bg-white/60" />
      <div className="flex gap-4">
        <div className="h-64 w-48 shrink-0 animate-pulse rounded-lg border border-line bg-white/60" />
        <div className="flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-line bg-white/60" />
          ))}
        </div>
      </div>
    </main>
  );
}

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const {
    project, status, pendingSteps, setActiveProjectId, refresh,
    isDictating, startDictation, stopDictation,
    isExtractingKeyPoints, startKeyPointsCapture, stopKeyPointsCapture,
    dictationError,
  } = useSession();
  const { showToast } = useToast();

  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(RATES.indexOf(1));
  const [captionsOn, setCaptionsOn] = useState(true);
  const [compact, setCompact] = useState(false);
  const [moreImagesOpen, setMoreImagesOpen] = useState(false);
  const [redactStepId, setRedactStepId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const transcriptInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (dictationError) showToast("error", dictationError);
  }, [dictationError, showToast]);

  useEffect(() => {
    setActiveProjectId(id);
    return () => setActiveProjectId(null);
  }, [id, setActiveProjectId]);

  const visibleSteps = (project?.steps ?? []).filter((s) => s.review_status !== "rejected");
  const hasVoiceAudio = (project?.steps ?? []).some((s) => !!s.audio_path);

  // Keep activeIndex in range as steps get added/removed.
  useEffect(() => {
    if (visibleSteps.length === 0) {
      setActiveIndex(0);
    } else if (activeIndex > visibleSteps.length - 1) {
      setActiveIndex(visibleSteps.length - 1);
    }
  }, [visibleSteps.length, activeIndex]);

  const speedMultiplier = RATES[rateIdx];

  useEffect(() => {
    if (!autoPlaying || visibleSteps.length < 2) return;
    const intervalMs = (BASE_AUTO_ADVANCE_SEC / speedMultiplier) * 1000;
    const timer = setInterval(() => {
      setActiveIndex((i) => {
        if (i >= visibleSteps.length - 1) {
          setAutoPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoPlaying, speedMultiplier, visibleSteps.length]);

  const jumpTo = (index: number) => {
    setActiveIndex(index);
    const step = visibleSteps[index];
    if (step) document.getElementById(`step-${step.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleStartRedaction = () => {
    if (pendingSteps.length === 0) {
      showToast("info", "Nothing needs redaction right now.");
      return;
    }
    setRedactStepId(pendingSteps[0].id);
  };

  const handleImportTranscription = async (file: File) => {
    const text = await file.text();
    if (!text.trim()) {
      showToast("error", "That file is empty.");
      return;
    }
    if (!project) return;
    setImporting(true);
    try {
      await api.submitManualNote(project.id, text.trim());
      showToast("success", "Transcription imported as a new section");
      refresh();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to import transcription");
    } finally {
      setImporting(false);
    }
  };

  if (!project) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="flex h-screen flex-col bg-[#F4F5F6] text-ink">
      <SessionTopBar
        project={project}
        steps={visibleSteps}
        pendingSteps={pendingSteps}
        activeIndex={activeIndex}
        onJump={jumpTo}
        autoPlaying={autoPlaying}
        onToggleAutoPlay={() => setAutoPlaying((p) => !p)}
        autoAdvanceSec={Number((BASE_AUTO_ADVANCE_SEC / speedMultiplier).toFixed(1))}
        processing={!!status?.processing}
        compact={compact}
        onToggleCompact={() => setCompact((c) => !c)}
        onOpenPending={setRedactStepId}
      />

      {/* Action Toolbar */}
      {!compact && (
        <div className="flex h-12 shrink-0 items-center border-b border-gray-300 bg-white px-4 gap-6 text-xs">
          <div className="flex items-center gap-2">
            <AddSectionButton projectId={project.id} onChange={refresh} />
            <button
              onClick={() => {
                setMoreImagesOpen(true);
                document.getElementById("add-image-top")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink"
            >
              More Images
            </button>
          </div>

          <div className="flex items-center">
            <span
              className={`border-y border-l px-3 py-1.5 rounded-l transition-colors ${
                isDictating ? "border-red-300 bg-red-50 text-red-500" : "border-gray-300 bg-gray-50 text-ink/40"
              }`}
              title={isDictating ? "Recording — transcription pending" : "No dictation in progress"}
            >
              Voice to Text Pending
            </span>
            <button
              onClick={() => (isExtractingKeyPoints ? stopKeyPointsCapture() : startKeyPointsCapture())}
              disabled={!project || isDictating}
              title="Record a longer voice memo -- AI breaks it into key points and places each under the right step"
              className={`border px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isExtractingKeyPoints ? "bg-accent text-white border-accent" : "border-gray-300 hover:bg-gray-100 text-ink/70"
              }`}
            >
              {isExtractingKeyPoints ? "Stop & Extract" : "Listen Voice"}
            </button>
            <button
              onClick={() => window.open(api.voiceNotesExportUrl(project.id), "_blank")}
              disabled={!hasVoiceAudio}
              title={hasVoiceAudio ? "Download every recorded voice clip for this session as a .zip" : "No voice recordings captured yet"}
              className="border-y border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink/70 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Export Voice to Audio
            </button>
            <button
              onClick={() => (isDictating ? stopDictation() : startDictation())}
              disabled={!project || isExtractingKeyPoints}
              title="Quick note, attached under the last step"
              className={`border px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDictating ? "bg-accent text-white border-accent" : "border-gray-300 hover:bg-gray-100 text-ink/70"
              }`}
            >
              {isDictating ? "Stop Voice Text" : "Start Voice Text"}
            </button>
            <button
              onClick={() => transcriptInputRef.current?.click()}
              disabled={importing}
              title="Import a .txt transcription and add it as a new section"
              className="border-y border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink/70 disabled:opacity-40"
            >
              {importing ? "Importing…" : "Import Transcription"}
            </button>
            <input
              ref={transcriptInputRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportTranscription(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={handleStartRedaction}
              className="border border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink/70 rounded-r"
            >
              Start Redaction{pendingSteps.length > 0 ? ` (${pendingSteps.length})` : ""}
            </button>
          </div>
        </div>
      )}

      <AIProcessingIndicator active={!!status?.processing} />
      <PendingReviewQueue
        pending={pendingSteps}
        onChange={refresh}
        openStepId={redactStepId}
        onOpenStepIdChange={setRedactStepId}
      />

      {/* Main Content Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar: Filmstrip */}
        <div className="w-64 shrink-0 border-r border-gray-300 bg-[#EDEEF0] p-3 overflow-y-auto">
          <Filmstrip steps={visibleSteps} activeIndex={activeIndex} onJump={jumpTo} />
        </div>

        {/* Main Panel: Steps */}
        <div className="flex-1 overflow-y-auto bg-white p-6 space-y-6">
          <div id="add-image-top">
            <AddImageBetween
              projectId={project.id}
              afterStepId={null}
              onChange={refresh}
              open={moreImagesOpen}
              onOpenChange={setMoreImagesOpen}
            />
          </div>

          {visibleSteps.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-ink/40">
              Waiting for recording to capture actions...
            </div>
          ) : (
            visibleSteps.map((step, idx) => (
              <div key={step.id} className="space-y-4">
                <StepCard step={step} index={idx} onChange={refresh} showCaption={captionsOn} />
                <AddImageBetween projectId={project.id} afterStepId={step.id} onChange={refresh} />
              </div>
            ))
          )}
        </div>
      </div>

      <MediaControlBar
        steps={visibleSteps}
        activeIndex={activeIndex}
        onJump={jumpTo}
        playbackRate={speedMultiplier}
        onCycleRate={() => setRateIdx((i) => (i + 1) % RATES.length)}
        captionsOn={captionsOn}
        onToggleCaptions={() => setCaptionsOn((c) => !c)}
      />
    </main>
  );
}
