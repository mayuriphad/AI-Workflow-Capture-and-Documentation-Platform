"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { RedactionBox } from "@/lib/types";
import Modal from "./Modal";

interface Props {
  stepId: string;
  onDone: () => void;
  onReject: () => void;
  onClose: () => void;
}

/**
 * Lets the user review Gemini's auto-suggested sensitive regions and/or
 * draw their own boxes, then approves (redact + insert into the live Word
 * doc) or rejects (discard the frame) a step queued in the pending-review
 * list. Nothing is redacted or inserted automatically without this step.
 */
export default function RedactionOverlay({ stepId, onDone, onReject, onClose }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"blackbox" | "blur">("blackbox");
  const [busy, setBusy] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    setImgLoaded(false);
    api.getReviewSuggestions(stepId).then((res) => {
      setScreenshot(res.screenshot);
      setBoxes(res.suggestions);
    });
  }, [stepId]);

  const toImageCoords = (clientX: number, clientY: number) => {
    const img = imgRef.current!;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const handleMouseDown: React.MouseEventHandler = (e) => {
    setDrawing(toImageCoords(e.clientX, e.clientY));
  };

  const handleMouseUp: React.MouseEventHandler = (e) => {
    if (!drawing) return;
    const end = toImageCoords(e.clientX, e.clientY);
    const box: RedactionBox = {
      left: Math.min(drawing.x, end.x),
      top: Math.min(drawing.y, end.y),
      width: Math.abs(end.x - drawing.x),
      height: Math.abs(end.y - drawing.y),
      label: "manual",
    };
    if (box.width > 4 && box.height > 4) setBoxes((prev) => [...prev, box]);
    setDrawing(null);
  };

  const removeBox = (idx: number) => setBoxes((prev) => prev.filter((_, i) => i !== idx));

  const approve = async () => {
    setBusy(true);
    try {
      await api.approveStep(stepId, boxes, mode);
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    try {
      await api.rejectStep(stepId);
      onReject();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-ink">Review before adding to SOP — sensitive info detected</h3>
        <button onClick={onClose} className="text-sm text-ink/50 hover:text-ink">
          Close
        </button>
      </div>

        <p className="mb-3 text-sm text-ink/60">
          Amber boxes are auto-suggested by Gemini vision. Draw your own by click-dragging on the
          image, or click a box to remove it. Approving redacts the boxes and inserts this step
          into the live Word document; rejecting discards the frame entirely.
        </p>

        {screenshot && (
          <div
            className="relative inline-block select-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={api.screenshotUrl(screenshot)}
              alt="Captured frame"
              className="max-w-full rounded border border-line"
              onLoad={() => setImgLoaded(true)}
            />
            {imgLoaded && boxes.map((box, idx) => {
              const img = imgRef.current;
              const scaleX = img && img.naturalWidth ? img.getBoundingClientRect().width / img.naturalWidth : 1;
              const scaleY = img && img.naturalHeight ? img.getBoundingClientRect().height / img.naturalHeight : 1;
              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBox(idx);
                  }}
                  title="Click to remove"
                  className="absolute cursor-pointer border-2 border-recording bg-recording/40 hover:bg-recording/70"
                  style={{
                    left: box.left * scaleX,
                    top: box.top * scaleY,
                    width: box.width * scaleX,
                    height: box.height * scaleY,
                  }}
                />
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "blackbox" | "blur")}
            className="rounded border border-line px-2 py-1 text-sm"
          >
            <option value="blackbox">Black box (full redaction)</option>
            <option value="blur">Blur (keep context)</option>
          </select>
          <button
            onClick={reject}
            disabled={busy}
            className="rounded-md border border-recording px-4 py-2 text-sm font-medium text-recording disabled:opacity-50"
          >
            Discard frame
          </button>
          <button
            onClick={approve}
            disabled={busy}
            className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Working…" : `Redact & insert (${boxes.length} box${boxes.length === 1 ? "" : "es"})`}
          </button>
        </div>
    </Modal>
  );
}
