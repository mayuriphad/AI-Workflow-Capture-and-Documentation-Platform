"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { VersionInfo } from "@/lib/types";

interface Props {
  projectId: string;
  onRestored: () => void;
}

export default function VersionHistoryPanel({ projectId, onRestored }: Props) {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    api.listVersions(projectId).then(setVersions);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const snapshot = async () => {
    setBusy(true);
    try {
      await api.createSnapshot(projectId, "manual");
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const restore = async (versionId: string) => {
    if (!confirm("Restore this version? Any edits made in Word since the last snapshot will be lost.")) return;
    setBusy(true);
    try {
      await api.restoreVersion(projectId, versionId);
      refresh();
      onRestored();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Version history</h3>
        <button
          onClick={snapshot}
          disabled={busy}
          className="rounded border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-40"
        >
          Save version now
        </button>
      </div>
      {versions.length === 0 ? (
        <p className="text-sm text-ink/40">No versions saved yet.</p>
      ) : (
        <ul className="space-y-1">
          {versions.map((v) => (
            <li key={v.id} className="flex items-center justify-between text-sm">
              <span className="text-ink/70">
                v{v.version_number} — {v.label} — {new Date(v.created_at * 1000).toLocaleString()}
              </span>
              <button
                onClick={() => restore(v.id)}
                disabled={busy}
                className="rounded border border-line px-2 py-1 text-xs font-medium text-ink hover:bg-paper/40 disabled:opacity-40"
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
