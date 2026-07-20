"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { AnalyticsSummary } from "@/lib/types";
import StatCard from "@/components/StatCard";

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

const PUBLISH_LABELS: Record<string, string> = {
  local_library: "SOP Library (Local)",
  sharepoint: "SharePoint",
  confluence: "Confluence",
  servicenow: "ServiceNow",
  salesforce: "Salesforce",
};

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatSkeleton() {
  return (
    <div className="h-[104px] animate-pulse rounded-xl border border-[#7DA0CA]/20 bg-white/60 dark:bg-[#052659]/20" />
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    api.getAnalyticsSummary().then(setData).catch(() => setData(null));
  }, []);

  const publishEntries = data ? Object.entries(data.publishes_by_provider) : [];
  const totalPublishes = publishEntries.reduce((s, [, n]) => s + n, 0);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f0f7ff] dark:bg-[#021024]">
      <div className="border-b border-[#7DA0CA]/20 dark:border-white/8 bg-white/70 dark:bg-[#052659]/20 backdrop-blur-sm px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-bold text-[#021024] dark:text-white tracking-tight">Analytics</h1>
          <p className="mt-0.5 text-sm text-[#021024]/50 dark:text-white/50">
            Real usage across every SOP you've recorded — no vanity metrics.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-8 py-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {!data ? (
            Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
          ) : (
            <>
              <StatCard index={0} label="SOPs Created" value={data.total_projects} icon={<IconLayers />} color="bg-[#052659]" />
              <StatCard index={1} label="Steps Captured" value={data.total_steps} icon={<IconImage />} color="bg-[#5483B3]" />
              <StatCard
                index={2}
                label="Voice Contributions"
                value={data.total_voice_notes + data.total_manual_notes}
                icon={<IconMic />}
                color="bg-[#7DA0CA]"
              />
              <StatCard
                index={3}
                label="Sensitive Frames Flagged"
                value={data.sensitive_frames_flagged}
                icon={<IconShield />}
                trend={data.steps_pending_review > 0 ? { value: `${data.steps_pending_review} awaiting review`, up: false } : undefined}
                color="bg-orange-500"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {!data ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatCard index={4} label="Versions Saved" value={data.total_versions} icon={<IconClock />} color="bg-emerald-600" />
              <StatCard index={5} label="Documents Published" value={totalPublishes} icon={<IconUpload />} color="bg-indigo-600" />
              <StatCard
                index={6}
                label="Steps Discarded"
                value={data.steps_rejected}
                icon={<IconShield />}
                color="bg-slate-500"
              />
            </>
          )}
        </div>

        {data && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-[#7DA0CA]/20 bg-white p-5 shadow-sm dark:bg-[#052659]/40 dark:border-white/10"
            >
              <h2 className="mb-3 text-sm font-semibold text-[#021024] dark:text-white">SOPs by status</h2>
              {Object.keys(data.projects_by_status).length === 0 ? (
                <p className="text-sm text-[#021024]/40 dark:text-white/40">No SOPs yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {Object.entries(data.projects_by_status).map(([status, n]) => (
                    <li key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-[#021024]/70 dark:text-white/70">{status}</span>
                      <span className="font-medium text-[#021024] dark:text-white">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-[#7DA0CA]/20 bg-white p-5 shadow-sm dark:bg-[#052659]/40 dark:border-white/10"
            >
              <h2 className="mb-3 text-sm font-semibold text-[#021024] dark:text-white">Publishes by target</h2>
              {publishEntries.length === 0 ? (
                <p className="text-sm text-[#021024]/40 dark:text-white/40">Nothing published yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {publishEntries.map(([provider, n]) => (
                    <li key={provider} className="flex items-center justify-between text-sm">
                      <span className="text-[#021024]/70 dark:text-white/70">{PUBLISH_LABELS[provider] ?? provider}</span>
                      <span className="font-medium text-[#021024] dark:text-white">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
        )}

        <div>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-[#021024]/40 dark:text-white/40">
            Recent Activity
          </h2>
          {!data ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg border border-[#7DA0CA]/20 bg-white/60 dark:bg-[#052659]/20" />
              ))}
            </div>
          ) : data.recent_activity.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#7DA0CA]/40 p-8 text-center text-sm text-[#021024]/50 dark:text-white/50">
              No activity yet. Record your first SOP to see it here.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.recent_activity.map((item, i) => (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                >
                  <Link
                    href={`/session/${item.project_id}`}
                    className="flex items-center justify-between rounded-lg border border-[#7DA0CA]/20 bg-white px-4 py-3 text-sm shadow-sm transition-all hover:border-[#5483B3]/40 hover:shadow-md dark:bg-[#052659]/40 dark:border-white/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[#021024] dark:text-white">{item.instruction ?? "(no instruction)"}</p>
                      <p className="mt-0.5 text-xs text-[#021024]/40 dark:text-white/40">
                        {item.project_title} · {item.kind.replace("_", " ")}
                        {item.review_status === "pending_review" && (
                          <span className="ml-1.5 font-medium text-orange-500">needs review</span>
                        )}
                      </p>
                    </div>
                    <span className="ml-3 shrink-0 text-xs text-[#021024]/35 dark:text-white/35">{timeAgo(item.created_at)}</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
