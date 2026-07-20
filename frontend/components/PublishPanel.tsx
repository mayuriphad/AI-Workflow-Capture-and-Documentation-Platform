"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PublishHistoryEntry, PublishTarget } from "@/lib/types";

interface Props {
  projectId: string;
}

const LABELS: Record<string, string> = {
  sharepoint: "SharePoint",
  confluence: "Confluence",
  servicenow: "ServiceNow",
  salesforce: "Salesforce",
};

export default function PublishPanel({ projectId }: Props) {
  const [targets, setTargets] = useState<PublishTarget[]>([]);
  const [history, setHistory] = useState<PublishHistoryEntry[]>([]);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    api.listPublishTargets().then(setTargets);
    api.listPublishHistory(projectId).then(setHistory);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const publish = async (provider: string) => {
    setBusyProvider(provider);
    setError(null);
    try {
      await api.publish(projectId, provider);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-ink">Export & publish</h3>

      <div className="mb-3 flex flex-wrap gap-2">
        {(["docx", "pdf", "html", "md"] as const).map((fmt) => (
          <a
            key={fmt}
            href={api.exportUrl(projectId, fmt)}
            className="rounded border border-line px-3 py-1.5 text-xs font-medium uppercase text-ink hover:bg-paper/40"
          >
            Export {fmt}
          </a>
        ))}
      </div>

      <div className="space-y-2">
        {targets.map((t) => (
          <div key={t.provider} className="flex items-center justify-between text-sm">
            <span className="text-ink/80">
              {LABELS[t.provider] ?? t.provider}
              {!t.configured && <span className="ml-2 text-xs text-ink/40">(not configured)</span>}
            </span>
            <button
              onClick={() => publish(t.provider)}
              disabled={!t.configured || busyProvider !== null}
              className="rounded border border-line px-2 py-1 text-xs font-medium text-ink disabled:opacity-40"
            >
              {busyProvider === t.provider ? "Publishing…" : "Publish"}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-xs text-recording">{error}</p>}

      {history.length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <p className="mb-1 text-xs font-medium text-ink/50">Recent publishes</p>
          <ul className="space-y-1 text-xs text-ink/60">
            {history.slice(0, 5).map((h) => (
              <li key={h.id} className="flex items-center justify-between">
                <span>
                  {LABELS[h.provider] ?? h.provider} — {h.status}
                </span>
                {h.remote_url && (
                  <a href={h.remote_url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    view
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
