"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Step } from "@/lib/types";
import { useToast } from "@/lib/ToastContext";

// Code-split: the box-drawing editor is only ever needed after a click, so
// it doesn't need to ship in the initial session-page bundle.
const ImageEditOverlay = dynamic(() => import("./ImageEditOverlay"), { ssr: false });

interface Props {
  step: Step;
  index: number;
  onChange: () => void;
  showCaption?: boolean;
}

export default function StepCard({ step, index, onChange, showCaption = true }: Props) {
  const { showToast } = useToast();
  const [editingImage, setEditingImage] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState(step.instruction ?? "");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canManage = step.review_status === "auto_inserted" || step.review_status === "approved";
  const hasImage = step.kind === "screenshot_step" && !!(step.screenshot_final_path || step.screenshot_raw_path);
  const label = `${hasImage ? "Img" : "Text"} ${index + 1}`;

  const handleReplace = async (file: File) => {
    setBusy(true);
    try {
      await api.replaceStepImage(step.id, file);
      showToast("success", "Image replaced");
      onChange();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to replace image");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this step? It will be removed from the live Word document.")) return;
    setBusy(true);
    try {
      await api.deleteStep(step.id);
      showToast("success", "Step deleted");
      onChange();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete step");
    } finally {
      setBusy(false);
    }
  };

  const openTextEdit = () => {
    setTextDraft(step.instruction ?? "");
    setEditingText(true);
  };

  const saveText = async () => {
    if (!textDraft.trim() || textDraft === step.instruction) {
      setEditingText(false);
      return;
    }
    setBusy(true);
    try {
      await api.updateStepText(step.id, textDraft.trim());
      showToast("success", "Text updated");
      setEditingText(false);
      onChange();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to update text");
    } finally {
      setBusy(false);
    }
  };

  const handlePencilClick = () => {
    if (hasImage) setEditingImage(true);
    else openTextEdit();
  };

  const textEditor = (
    <div className="space-y-2">
      <textarea
        autoFocus
        value={textDraft}
        onChange={(e) => setTextDraft(e.target.value)}
        rows={hasImage ? 2 : 4}
        className="w-full rounded border border-gray-300 bg-white px-2.5 py-2 text-sm text-ink focus:outline-none focus:border-accent"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={saveText}
          disabled={busy || !textDraft.trim()}
          className="rounded bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={() => setEditingText(false)}
          className="rounded border border-gray-300 px-3 py-1 text-xs text-ink/60"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      id={`step-${step.id}`}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-transparent"
    >
      {/* faint label above the bar */}
      <p className="mb-1 text-xs text-ink/35 font-medium">{label}</p>

      {/* Teal instruction bar */}
      <div
        className={`flex items-center justify-between gap-3 bg-[#C8E1E5] px-4 py-2.5 text-[#0F3540] border border-gray-200 ${
          hasImage ? "rounded-t border-b-0" : "rounded"
        }`}
      >
        <div className="flex-1 min-w-0">
          {!hasImage && (editingText ? textEditor : (
            <p
              onClick={canManage ? openTextEdit : undefined}
              className={`text-sm font-medium whitespace-pre-wrap ${canManage ? "cursor-text hover:bg-black/5 rounded px-1 -mx-1 transition-colors" : ""}`}
              title={canManage ? "Click to edit" : undefined}
            >
              {step.instruction || "Navigate to the Taskbar and click on..."}
            </p>
          ))}
        </div>

        {canManage && (
          <div className="flex items-center gap-3 text-[#0F3540]/60 shrink-0">
            <button
              onClick={handlePencilClick}
              disabled={busy}
              className="hover:text-[#0F3540] transition-colors"
              title={hasImage ? "Edit / Redact Image" : "Edit Text"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={busy}
              className="hover:text-red-600 transition-colors"
              title="Delete"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Optional caption + screenshot for image steps */}
      {hasImage && (
        <div className="border border-t-0 border-gray-200 rounded-b bg-white">
          {showCaption && (
            editingText ? (
              <div className="px-4 pt-3">{textEditor}</div>
            ) : (
              <p
                onClick={canManage ? openTextEdit : undefined}
                className={`px-4 pt-3 text-xs text-ink/60 whitespace-pre-wrap ${canManage ? "cursor-text hover:bg-gray-50 transition-colors" : ""}`}
                title={canManage ? "Click to edit" : undefined}
              >
                {step.instruction || "No caption yet — click to add one"}
              </p>
            )
          )}
          <div className="flex justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={api.screenshotUrl(step.project_id + "/" + (step.screenshot_final_path ?? step.screenshot_raw_path)?.split(/[\\/]/).pop())}
              alt="Step Screenshot"
              className="w-full max-w-4xl object-contain border border-gray-200 bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Hidden file input for replace if needed */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleReplace(file);
          e.target.value = "";
        }}
      />

      <AnimatePresence>
        {editingImage && (
          <ImageEditOverlay
            step={step}
            onDone={() => {
              setEditingImage(false);
              onChange();
            }}
            onClose={() => setEditingImage(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
