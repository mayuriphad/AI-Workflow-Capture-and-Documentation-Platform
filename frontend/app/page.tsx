"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { ProjectSummary } from "@/lib/types";
import StatCard from "@/components/StatCard";

// ─── Icons ───────────────────────────────────────────────────────────────────

function IconFile() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

function IconText() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  );
}

function IconRecord() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function initials(title: string): string {
  return title.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const BG_COLORS = [
  "bg-[#052659]",
  "bg-[#5483B3]",
  "bg-[#7DA0CA]",
  "bg-[#021024]",
  "bg-slate-600",
  "bg-indigo-700",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function DocCard({ doc, index }: { doc: ProjectSummary; index: number }) {
  const bg = BG_COLORS[index % BG_COLORS.length];
  return (
    <Link
      href={`/session/${doc.id}`}
      className="group block relative overflow-hidden rounded-2xl border border-[#7DA0CA]/30 bg-white/60 p-5 shadow-sm hover:border-[#5483B3]/60 hover:shadow-xl hover:shadow-[#052659]/5 transition-all duration-300 dark:bg-[#052659]/20 dark:border-white/10 dark:hover:border-[#5483B3]/80 backdrop-blur-md"
    >
      {/* Decorative gradient orb */}
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-[#5483B3]/20 to-transparent blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

      {/* Colour stripe + initials */}
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${bg.replace('bg-', 'from-').replace(']', ']/80')} to-[#021024] text-sm font-bold text-white shadow-inner`}>
        {initials(doc.title)}
      </div>

      <h3 className="text-base font-bold text-[#021024] dark:text-white leading-snug group-hover:text-[#052659] dark:group-hover:text-[#7DA0CA] transition-colors line-clamp-2 mb-3">
        {doc.title}
      </h3>

      <div className="flex items-center gap-4 text-xs font-medium text-[#021024]/50 dark:text-white/50 mb-1">
        {doc.step_count > 0 && (
          <span className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-2.5 py-1 rounded-md">
            <IconImage /> {doc.step_count} step{doc.step_count !== 1 ? "s" : ""}
          </span>
        )}
        {doc.pending_count > 0 && (
          <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md">
            <IconText /> {doc.pending_count} review
          </span>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[#7DA0CA]/10 dark:border-white/5 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#7DA0CA]/20 to-[#7DA0CA]/5 px-3 py-1 text-xs font-semibold text-[#052659] dark:from-white/15 dark:to-white/5 dark:text-[#7DA0CA]">
          {doc.status === "active" ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Recording</>
          ) : doc.status === "archived" ? (
            "Archived"
          ) : (
            "Draft"
          )}
        </span>
        <span className="text-xs font-medium text-[#021024]/40 dark:text-white/35">{timeAgo(doc.created_at)}</span>
      </div>
    </Link>
  );
}

function EmptyState({ onCreateStory }: { onCreateStory: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#7DA0CA]/40 bg-white/50 dark:bg-white/3 dark:border-white/15 py-20 px-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#052659]/8 dark:bg-white/8 text-[#5483B3]">
        <IconFile />
      </div>
      <h3 className="text-base font-semibold text-[#021024] dark:text-white mb-1">No stories yet</h3>
      <p className="text-sm text-[#021024]/50 dark:text-white/50 max-w-xs">
        Start by creating your first SOP. Record a workflow and let FlowDocs AI turn it into professional documentation.
      </p>
      <button
        onClick={onCreateStory}
        className="mt-6 flex items-center gap-2 rounded-lg bg-[#052659] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#021024] transition-colors shadow-sm"
      >
        <IconPlus /> Create your first story
      </button>
    </div>
  );
}

// ─── Quick Action Card ─────────────────────────────────────────────────────

function QuickAction({
  label, description, icon, color, onClick,
}: {
  label: string; description: string; icon: React.ReactNode; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full max-w-xl items-start gap-4 rounded-xl border border-[#7DA0CA]/20 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:border-[#5483B3]/40 hover:shadow-md dark:bg-[#052659]/40 dark:border-white/10 dark:hover:border-[#5483B3]/50"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color} transition-transform group-hover:scale-105`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#021024] dark:text-white group-hover:text-[#052659] dark:group-hover:text-[#7DA0CA] transition-colors">{label}</p>
        <p className="text-xs text-[#021024]/50 dark:text-white/50 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <span className="ml-auto shrink-0 text-[#021024]/25 dark:text-white/25 group-hover:text-[#052659] dark:group-hover:text-[#7DA0CA] transition-colors mt-0.5">
        <IconArrowRight />
      </span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [docs, setDocs] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.listProjects()
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const totalSteps = docs.reduce((s, d) => s + d.step_count, 0);
  const totalPending = docs.reduce((s, d) => s + d.pending_count, 0);

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f0f7ff] dark:bg-[#021024]">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-[#7DA0CA]/20 dark:border-white/10 bg-white/70 dark:bg-[#021024]/70 backdrop-blur-md px-8 py-6 shadow-sm">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-[#052659] to-[#5483B3] dark:from-[#7DA0CA] dark:to-white bg-clip-text text-transparent tracking-tight">
              Dashboard
            </h1>
            <p className="mt-1 text-sm font-medium text-[#021024]/60 dark:text-white/60">Your SOP documentation workspace</p>
          </div>
          <p className="text-sm font-medium text-[#021024]/40 dark:text-white/40 bg-[#7DA0CA]/10 dark:bg-white/5 px-4 py-1.5 rounded-full">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-8 py-8 space-y-10">

        {/* ── Stats Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Stories"
            value={loading ? "—" : docs.length}
            icon={<IconLayers />}
            trend={docs.length > 0 ? { value: `${docs.length} total`, up: true } : undefined}
            color="bg-gradient-to-br from-[#052659] to-[#021024]"
          />
          <StatCard
            label="Published"
            value={0}
            icon={<IconCheckCircle />}
            color="bg-gradient-to-br from-emerald-500 to-emerald-700"
          />
          <StatCard
            label="Drafts"
            value={loading ? "—" : docs.length}
            icon={<IconFile />}
            color="bg-gradient-to-br from-[#5483B3] to-[#052659]"
          />
          <StatCard
            label="Captured Steps"
            value={loading ? "—" : totalSteps}
            icon={<IconClock />}
            trend={totalPending > 0 ? { value: `${totalPending} need review`, up: false } : undefined}
            color="bg-gradient-to-br from-[#7DA0CA] to-[#5483B3]"
          />
        </div>

        {/* ── Quick Actions ────────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#052659] dark:text-[#7DA0CA] mb-4 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-[#052659]/30 dark:bg-[#7DA0CA]/30"></span>
            Quick Actions
          </h2>
          <QuickAction
            label="Record New SOP"
            description="Capture a workflow and auto-generate a document, live, in Microsoft Word"
            icon={<div className="text-white drop-shadow-md"><IconRecord /></div>}
            color="bg-gradient-to-br from-[#052659] via-[#5483B3] to-[#052659] bg-[length:200%_200%] hover:bg-[100%_100%] transition-all duration-500 shadow-lg shadow-[#052659]/20"
            onClick={() => {
              window.dispatchEvent(new CustomEvent("sop:create"));
            }}
          />
        </div>

        {/* ── Recent Documents ─────────────────────────────────────────── */}
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#052659] dark:text-[#7DA0CA] mb-4 flex items-center gap-2">
            <span className="w-8 h-[1px] bg-[#052659]/30 dark:bg-[#7DA0CA]/30"></span>
            Recent Documents
          </h2>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 rounded-2xl border border-[#7DA0CA]/20 bg-white/40 dark:bg-[#052659]/10 animate-pulse backdrop-blur-sm" />
              ))}
            </div>
          ) : docs.length === 0 ? (
            <EmptyState onCreateStory={() => window.dispatchEvent(new CustomEvent("sop:create"))} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {docs.slice(0, 9).map((doc, i) => (
                <DocCard key={doc.id} doc={doc} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
