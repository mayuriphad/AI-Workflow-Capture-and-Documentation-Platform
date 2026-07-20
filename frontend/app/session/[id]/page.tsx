"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "@/lib/SessionContext";
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
  const { project, status, pendingSteps, setActiveProjectId, refresh } = useSession();

  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(RATES.indexOf(1));
  const [captionsOn, setCaptionsOn] = useState(true);
  const [compact, setCompact] = useState(false);
  const [moreImagesOpen, setMoreImagesOpen] = useState(false);

  useEffect(() => {
    setActiveProjectId(id);
    return () => setActiveProjectId(null);
  }, [id, setActiveProjectId]);

  const visibleSteps = (project?.steps ?? []).filter((s) => s.review_status !== "rejected");

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

  if (!project) {
    return <LoadingSkeleton />;
  }

  return (
    <main className="flex h-screen flex-col bg-[#F4F5F6] text-ink">
      <SessionTopBar
        project={project}
        steps={visibleSteps}
        activeIndex={activeIndex}
        onJump={jumpTo}
        autoPlaying={autoPlaying}
        onToggleAutoPlay={() => setAutoPlaying((p) => !p)}
        autoAdvanceSec={Number((BASE_AUTO_ADVANCE_SEC / speedMultiplier).toFixed(1))}
        processing={!!status?.processing}
        compact={compact}
        onToggleCompact={() => setCompact((c) => !c)}
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
            <button className="border-y border-l border-gray-300 bg-red-50 text-red-500 px-3 py-1.5 rounded-l">Voice to Text Pending</button>
            <button className="border border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink/70">Listen Voice</button>
            <button className="border-y border-gray-300 px-3 py-1.5 bg-gray-100 text-ink font-medium">Export Voice to Audio</button>
            <button className="border border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink/70">Start Voice Text</button>
            <button className="border-y border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink/70">Import Transcription</button>
            <button className="border border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink/70 rounded-r">Start Redaction</button>
          </div>
        </div>
      )}

      <AIProcessingIndicator active={!!status?.processing} />
      <PendingReviewQueue pending={pendingSteps} onChange={refresh} />

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
