"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import type { RedactionBox, Step } from "@/lib/types";
import { useToast } from "@/lib/ToastContext";
import Modal from "./Modal";

interface Props {
  step: Step;
  onDone: () => void;
  onClose: () => void;
}

/**
 * Redact or annotate the image already inserted into the live Word
 * document for this step. Same box-drawing interaction as the pre-insert
 * RedactionOverlay, but operates on an already-inserted step (swaps the
 * edited image into the document in place via /steps/{id}/edit-image)
 * rather than gating an insertion that hasn't happened yet.
 */
export default function ImageEditOverlay({ step, onDone, onClose }: Props) {
  const { showToast } = useToast();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [boxes, setBoxes] = useState<RedactionBox[]>([]);
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<"blackbox" | "blur" | "annotate">("annotate");
  const [labelDraft, setLabelDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const relativePath = (() => {
    const path = step.screenshot_final_path ?? step.screenshot_raw_path;
    if (!path) return null;
    const filename = path.split(/[\\/]/).pop();
    return `${step.project_id}/${filename}`;
  })();

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
      label: mode === "annotate" ? labelDraft.trim() || undefined : undefined,
    };
    if (box.width > 4 && box.height > 4) setBoxes((prev) => [...prev, box]);
    setDrawing(null);
  };

  const removeBox = (idx: number) => setBoxes((prev) => prev.filter((_, i) => i !== idx));

  const apply = async () => {
    setBusy(true);
    try {
      await api.editStepImage(step.id, boxes, mode);
      showToast("success", mode === "annotate" ? "Annotation applied" : "Redaction applied");
      onDone();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to apply edit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onClose} maxWidth="max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-ink">Redact or annotate this image</h3>
        <button onClick={onClose} className="text-sm text-ink/50 hover:text-ink">
          Close
        </button>
      </div>

        <p className="mb-3 text-sm text-ink/60">
          Draw a box by click-dragging. Click a box to remove it. This edits the image already in the
          live Word document, in place.
        </p>

        {relativePath && (
          <div
            className="relative inline-block select-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={api.screenshotUrl(relativePath)}
              alt="Step frame"
              className="max-w-full rounded border border-line"
            />
            {boxes.map((box, idx) => {
              const img = imgRef.current;
              const scaleX = img ? img.getBoundingClientRect().width / img.naturalWidth : 1;
              const scaleY = img ? img.getBoundingClientRect().height / img.naturalHeight : 1;
              const color = mode === "annotate" ? "border-accent bg-accent/30 hover:bg-accent/60" : "border-recording bg-recording/40 hover:bg-recording/70";
              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBox(idx);
                  }}
                  title="Click to remove"
                  className={`absolute cursor-pointer border-2 ${color}`}
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

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "blackbox" | "blur" | "annotate")}
            className="rounded border border-line px-2 py-1 text-sm"
          >
            <option value="annotate">Annotate (highlight + caption)</option>
            <option value="blackbox">Black box (full redaction)</option>
            <option value="blur">Blur (keep context)</option>
          </select>
          {mode === "annotate" && (
            <input
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              placeholder="Caption for the next box…"
              className="rounded border border-line px-2 py-1 text-sm"
            />
          )}
          <button
            onClick={apply}
            disabled={busy || boxes.length === 0}
            className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Applying…" : `Apply ${boxes.length} box${boxes.length === 1 ? "" : "es"}`}
          </button>
        </div>
    </Modal>
  );
}
