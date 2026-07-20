"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import DropdownPanel from "./DropdownPanel";

interface Props {
  projectId: string;
  onChange: () => void;
}

/** Toolbar trigger for a text-only section -- posts to the existing
 * /sessions/{id}/manual-note endpoint (same one voice dictation already
 * uses), appended after the last inserted step. */
export default function AddSectionButton({ projectId, onChange }: Props) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api.submitManualNote(projectId, text.trim());
      showToast("success", "Section added");
      setOpen(false);
      setText("");
      onChange();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to add section");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-100 text-ink"
      >
        Add Section
      </button>
      <DropdownPanel
        open={open}
        className="absolute left-0 top-10 w-72 rounded bg-white border border-gray-300 shadow-xl overflow-hidden z-50"
      >
        <div className="p-3 space-y-2">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text for this section…"
            rows={3}
            className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:border-accent"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={busy || !text.trim()}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              {busy ? "Adding…" : "Add"}
            </button>
            <button
              onClick={() => { setOpen(false); setText(""); }}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-ink/60"
            >
              Cancel
            </button>
          </div>
        </div>
      </DropdownPanel>
    </div>
  );
}
