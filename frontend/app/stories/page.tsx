"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import type { ProjectSummary, ProjectStatus } from "@/lib/types";
import { useToast } from "@/lib/ToastContext";

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_FILTERS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "stopped", label: "Draft" },
  { value: "archived", label: "Published" },
];

const STATUS_BADGE: Record<ProjectStatus, string> = {
  active: "bg-recording/15 text-recording",
  stopped: "bg-[#7DA0CA]/15 text-[#052659] dark:text-[#7DA0CA]",
  archived: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export default function StoriesPage() {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = () => {
    api.listProjects().then(setProjects).catch(() => setProjects([])).finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (query.trim() && !p.title.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [projects, query, statusFilter]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.deleteProject(id);
      showToast("success", "SOP deleted");
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f0f7ff] dark:bg-[#021024]">
      <div className="border-b border-[#7DA0CA]/20 dark:border-white/8 bg-white/70 dark:bg-[#052659]/20 backdrop-blur-sm px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-bold text-[#021024] dark:text-white tracking-tight">Stories / All SOPs</h1>
          <p className="mt-0.5 text-sm text-[#021024]/50 dark:text-white/50">Every SOP you've recorded, searchable and manageable.</p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-5 px-8 py-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border border-[#7DA0CA]/40 bg-white px-3 py-2 dark:bg-[#052659]/40 dark:border-white/15">
            <span className="text-[#5483B3]">
              <IconSearch />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search SOPs by name…"
              className="w-full bg-transparent text-sm text-[#021024] outline-none placeholder:text-[#021024]/35 dark:text-white dark:placeholder:text-white/35"
            />
          </div>
          <div className="flex gap-1 rounded-lg border border-[#7DA0CA]/30 bg-white p-1 dark:bg-[#052659]/40 dark:border-white/15">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? "bg-[#052659] text-white"
                    : "text-[#021024]/60 hover:bg-[#052659]/6 dark:text-white/60 dark:hover:bg-white/8"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl border border-[#7DA0CA]/20 bg-white/60 dark:bg-[#052659]/20" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#7DA0CA]/40 p-12 text-center text-sm text-[#021024]/50 dark:text-white/50">
            {projects.length === 0 ? "No SOPs recorded yet." : "No SOPs match your search/filter."}
          </p>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence>
              {filtered.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between rounded-xl border border-[#7DA0CA]/20 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:bg-[#052659]/40 dark:border-white/10"
                >
                  <Link href={`/session/${p.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="truncate text-sm font-medium text-[#021024] dark:text-white">{p.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_BADGE[p.status]}`}>
                        {p.status === "stopped" ? "draft" : p.status === "archived" ? "published" : p.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#021024]/45 dark:text-white/45">
                      {p.step_count} step{p.step_count === 1 ? "" : "s"}
                      {p.pending_count > 0 && <span className="ml-1.5 font-medium text-orange-500">{p.pending_count} needs review</span>}
                      {" · "}
                      {timeAgo(p.updated_at)}
                    </p>
                  </Link>
                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    disabled={deletingId === p.id}
                    className="ml-3 shrink-0 rounded-lg border border-transparent p-2 text-[#021024]/35 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:text-white/35 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <IconTrash />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </main>
  );
}
