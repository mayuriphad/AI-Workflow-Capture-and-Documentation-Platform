"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";

interface Props {
  projectId: string;
  afterStepId: string | null;
  onChange: () => void;
  // Uncontrolled by default (each "add between" slot manages its own toggle);
  // pass these when an outside trigger (the "More Images" toolbar button)
  // needs to open this specific instance itself.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function AddImageBetween({ projectId, afterStepId, onChange, open: controlledOpen, onOpenChange }: Props) {
  const { showToast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [instruction, setInstruction] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!file || !instruction.trim()) return;
    setBusy(true);
    try {
      await api.addImageStep(projectId, instruction.trim(), file, afterStepId ?? undefined);
      showToast("success", "Step added");
      setOpen(false);
      setInstruction("");
      setFile(null);
      onChange();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to add step");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!open ? (
        <motion.button
          key="trigger"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          whileHover={{ scale: 1.01 }}
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center rounded border border-dashed border-line py-1.5 text-xs text-ink/40 transition-colors hover:border-accent hover:text-accent"
        >
          + Add image here
        </motion.button>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="space-y-2 overflow-hidden rounded-lg border border-line bg-white p-3"
        >
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Instruction for this step…"
            className="w-full rounded border border-line px-2 py-1.5 text-sm"
          />
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-xs"
          />
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={submit}
              disabled={busy || !file || !instruction.trim()}
              className="rounded bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
            >
              {busy ? "Adding…" : "Add"}
            </motion.button>
            <button
              onClick={() => setOpen(false)}
              className="rounded border border-line px-3 py-1.5 text-xs text-ink/60"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
