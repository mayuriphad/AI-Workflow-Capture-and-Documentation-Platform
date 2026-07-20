"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useSession } from "@/lib/SessionContext";
import { useToast } from "@/lib/ToastContext";
import type { PublishTarget } from "@/lib/types";
import Modal from "./Modal";
import DropdownPanel from "./DropdownPanel";

// The navbar is mounted on every route, so anything only needed inside its
// modals is code-split rather than shipped in the global bundle.
const RedactionOverlay = dynamic(() => import("./RedactionOverlay"), { ssr: false });
const PendingReviewQueue = dynamic(() => import("./PendingReviewQueue"), { ssr: false });
const VersionHistoryPanel = dynamic(() => import("./VersionHistoryPanel"), { ssr: false });

// ─── Icon Components ──────────────────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
      <rect width="30" height="30" rx="8" fill="#052659" />
      <circle cx="15" cy="15" r="6" stroke="#C1E8FF" strokeWidth="1.5" fill="none" />
      <circle cx="15" cy="15" r="2.5" fill="#5483B3" />
      <circle cx="15" cy="9.5" r="1.2" fill="#7DA0CA" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function IconPublish() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-9-9" /><polyline points="21 3 12 12" /><polyline points="21 3 15 3" /><polyline points="21 3 21 9" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconFileText() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconBarChart() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

// ─── Data ────────────────────────────────────────────────────────────────

const EXPORT_FORMATS: { fmt: "docx" | "pdf" | "html" | "md"; label: string }[] = [
  { fmt: "docx", label: "View DOCX" },
  { fmt: "pdf", label: "View PDF" },
  { fmt: "html", label: "View HTML" },
  { fmt: "md", label: "View Markdown" },
];

const PUBLISH_LABELS: Record<string, string> = {
  local_library: "SOP Library (Local)",
  sharepoint: "SharePoint",
  confluence: "Confluence",
  servicenow: "ServiceNow",
  salesforce: "Salesforce",
};

interface Notif {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

const NOTIFICATIONS: Notif[] = [
  { id: "1", title: "SOP Published", body: "VPN Access Reset was successfully published", time: "2m ago", read: false },
  { id: "2", title: "Processing Complete", body: "Customer Onboarding recording is ready to review", time: "1h ago", read: false },
  { id: "3", title: "Export Ready", body: "PDF export of Expense Claim SOP is ready", time: "3h ago", read: true },
];

// ─── Small building blocks ────────────────────────────────────────────────

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${on ? "bg-[#052659]" : "bg-[#7DA0CA]/40"}`}>
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? "translate-x-4" : "translate-x-0.5"}`} />
    </div>
  );
}

function ActionButton({
  icon, label, onClick, disabled, tone = "default", title,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean;
  tone?: "default" | "recording" | "accent"; title?: string;
}) {
  const toneClasses =
    tone === "recording"
      ? "text-recording border-recording/50 hover:bg-recording/10"
      : tone === "accent"
        ? "bg-[#052659] text-white border-transparent hover:bg-[#021024]"
        : "text-[#021024]/70 border-transparent hover:bg-[#052659]/6 hover:text-[#021024] dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35 ${toneClasses}`}
    >
      {icon}
      <span className="hidden xl:inline whitespace-nowrap">{label}</span>
    </button>
  );
}

// ─── Dropdown: View Documents ──────────────────────────────────────────────

export function ViewDocumentsDropdown({ disabled, projectId }: { disabled: boolean; projectId: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#021024]/70 hover:bg-[#052659]/6 hover:text-[#021024] transition-colors disabled:cursor-not-allowed disabled:opacity-35 dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
      >
        <IconFileText />
        <span className="hidden xl:inline">Documents</span>
        <IconChevronDown />
      </button>
      <DropdownPanel
        open={open && !!projectId}
        className="absolute right-0 top-11 w-52 rounded-xl border border-[#7DA0CA]/25 bg-white shadow-2xl dark:bg-[#052659] dark:border-white/10 overflow-hidden"
      >
        <div className="border-b border-[#7DA0CA]/20 dark:border-white/10 px-3.5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#021024]/40 dark:text-white/40">View Documents</span>
        </div>
        <div className="py-1">
          {projectId &&
            EXPORT_FORMATS.map(({ fmt, label }) => (
              <a
                key={fmt}
                href={api.exportUrl(projectId, fmt)}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#021024]/70 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <IconFileText />
                {label}
              </a>
            ))}
        </div>
      </DropdownPanel>
    </div>
  );
}

// ─── Dropdown: Advanced Features ──────────────────────────────────────────

function AdvancedFeaturesDropdown({
  dark, onToggleDark, projectId, onVersionHistory, onLibrary,
}: {
  dark: boolean; onToggleDark: () => void; projectId: string | null; onVersionHistory: () => void; onLibrary: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#021024]/70 hover:bg-[#052659]/6 hover:text-[#021024] transition-colors dark:text-white/70 dark:hover:bg-white/8 dark:hover:text-white"
      >
        <IconGrid />
        <span className="hidden xl:inline">Advanced</span>
        <IconChevronDown />
      </button>
      <DropdownPanel
        open={open}
        className="absolute right-0 top-11 w-64 rounded-xl border border-[#7DA0CA]/25 bg-white shadow-2xl dark:bg-[#052659] dark:border-white/10 overflow-hidden"
      >
          <div className="border-b border-[#7DA0CA]/20 dark:border-white/10 px-3.5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#021024]/40 dark:text-white/40">Advanced Features</span>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                onVersionHistory();
              }}
              disabled={!projectId}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#021024]/70 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors disabled:cursor-not-allowed disabled:opacity-35 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <IconClock />
              Version History
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onLibrary();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#021024]/70 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <IconFileText />
              SOP Library
            </button>

            <Link
              href="/stories"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#021024]/70 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <IconGrid />
              Stories / All SOPs
            </Link>

            <Link
              href="/analytics"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#021024]/70 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <IconBarChart />
              Analytics
            </Link>

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-[#021024]/70 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <IconSettings />
              Settings
            </Link>
          </div>

          <div className="border-t border-[#7DA0CA]/20 dark:border-white/10 px-3.5 py-2.5">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-sm text-[#021024]/70 dark:text-white/70">
                {dark ? <IconMoon /> : <IconSun />}
                Dark mode
              </span>
              <button type="button" role="switch" aria-checked={dark} onClick={onToggleDark}>
                <Toggle on={dark} />
              </button>
            </label>
          </div>
      </DropdownPanel>
    </div>
  );
}

// ─── Dropdown: Publish ─────────────────────────────────────────────────────

export function PublishDropdown({
  projectId, renderTrigger,
}: {
  projectId: string | null;
  // Lets callers outside Navbar (e.g. the session page's dark top bar) swap
  // in their own trigger element without duplicating the publish-target
  // fetch/publish/result logic below.
  renderTrigger?: (onClick: () => void, disabled: boolean) => React.ReactNode;
}) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState<PublishTarget[]>([]);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openMenu = () => {
    setOpen((o) => !o);
    setResult(null);
    api.listPublishTargets().then(setTargets);
  };

  const publish = async (provider: string) => {
    if (!projectId) return;
    setBusyProvider(provider);
    setResult(null);
    try {
      const res = await api.publish(projectId, provider);
      const label = PUBLISH_LABELS[provider] ?? provider;
      if (res.success) {
        setResult(`Published to ${label}`);
        showToast("success", `Published to ${label}`);
      } else {
        setResult(res.error ?? "Publish failed");
        showToast("error", res.error ?? "Publish failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publish failed";
      setResult(message);
      showToast("error", message);
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {renderTrigger ? (
        renderTrigger(openMenu, !projectId)
      ) : (
        <ActionButton icon={<IconPublish />} label="Publish" onClick={openMenu} disabled={!projectId} />
      )}
      <DropdownPanel
        open={open}
        className="absolute right-0 top-11 w-64 rounded-xl border border-[#7DA0CA]/25 bg-white shadow-2xl dark:bg-[#052659] dark:border-white/10 overflow-hidden z-50"
      >
          <div className="border-b border-[#7DA0CA]/20 dark:border-white/10 px-3.5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#021024]/40 dark:text-white/40">Publish to</span>
          </div>
          <div className="py-1">
            {targets.map((t) => (
              <button
                key={t.provider}
                onClick={() => publish(t.provider)}
                disabled={!t.configured || busyProvider !== null}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-sm text-[#021024]/70 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors disabled:cursor-not-allowed disabled:opacity-35 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <span>{PUBLISH_LABELS[t.provider] ?? t.provider}</span>
                <span className="text-[10px] text-[#021024]/35 dark:text-white/35">
                  {busyProvider === t.provider ? "Publishing…" : t.configured ? "" : "Not configured"}
                </span>
              </button>
            ))}
          </div>
          {result && (
            <div className="border-t border-[#7DA0CA]/20 dark:border-white/10 px-3.5 py-2.5 text-xs text-[#021024]/60 dark:text-white/60">
              {result}
            </div>
          )}
      </DropdownPanel>
    </div>
  );
}

// ─── Voice dictation with mic picker ───────────────────────────────────────

function DictationControl() {
  const {
    isDictating, startDictation, stopDictation,
    isExtractingKeyPoints, startKeyPointsCapture, stopKeyPointsCapture,
    lastKeyPoints, dictationError,
    micDevices, selectedMicId, setSelectedMicId, refreshMicDevices, project,
  } = useSession();
  const { showToast } = useToast();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (lastKeyPoints) setSummaryOpen(true);
  }, [lastKeyPoints]);

  useEffect(() => {
    if (dictationError) showToast("error", dictationError);
  }, [dictationError, showToast]);

  return (
    <div className="relative flex items-center" ref={ref}>
      <ActionButton
        icon={<IconMic />}
        label={isDictating ? "Stop Dictation" : "Voice Dictation"}
        onClick={() => (isDictating ? stopDictation() : startDictation())}
        disabled={!project || isExtractingKeyPoints}
        tone={isDictating ? "recording" : "default"}
        title="Quick note, attached under the last step"
      />
      <ActionButton
        icon={<IconMic />}
        label={isExtractingKeyPoints ? "Stop & Extract" : "Extract Key Points"}
        onClick={() => (isExtractingKeyPoints ? stopKeyPointsCapture() : startKeyPointsCapture())}
        disabled={!project || isDictating}
        tone={isExtractingKeyPoints ? "recording" : "default"}
        title="Longer voice memo -- AI breaks it into key points and places each under the right step"
      />
      <button
        onClick={() => {
          if (!project) return;
          refreshMicDevices();
          setPickerOpen((o) => !o);
        }}
        disabled={!project}
        title="Choose microphone"
        className="ml-0.5 rounded-lg p-1.5 text-[#021024]/40 hover:bg-[#052659]/6 hover:text-[#021024] transition-colors disabled:cursor-not-allowed disabled:opacity-35 dark:text-white/40 dark:hover:bg-white/8 dark:hover:text-white"
      >
        <IconChevronDown />
      </button>

      <DropdownPanel
        open={summaryOpen && !!lastKeyPoints}
        className="absolute right-0 top-11 w-80 rounded-xl border border-[#7DA0CA]/25 bg-white shadow-2xl dark:bg-[#052659] dark:border-white/10 overflow-hidden z-50"
      >
        {lastKeyPoints && (
          <>
            <div className="flex items-center justify-between border-b border-[#7DA0CA]/20 dark:border-white/10 px-3.5 py-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#021024]/40 dark:text-white/40">
                {lastKeyPoints.key_points.length} key point{lastKeyPoints.key_points.length === 1 ? "" : "s"} inserted
              </span>
              <button onClick={() => setSummaryOpen(false)} className="text-[#021024]/40 hover:text-[#021024] dark:text-white/40 dark:hover:text-white">
                <IconX />
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {lastKeyPoints.key_points.map((kp) => (
                <div key={kp.step_id} className="px-3.5 py-2 text-sm text-[#021024]/70 dark:text-white/70">
                  {kp.text}
                  <span className="ml-1.5 text-[10px] text-[#021024]/35 dark:text-white/35">
                    {kp.attached_to_step_id ? "attached to a step" : "appended as a general note"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </DropdownPanel>

      <DropdownPanel
        open={pickerOpen}
        className="absolute right-0 top-11 w-64 rounded-xl border border-[#7DA0CA]/25 bg-white shadow-2xl dark:bg-[#052659] dark:border-white/10 overflow-hidden z-50"
      >
          <div className="border-b border-[#7DA0CA]/20 dark:border-white/10 px-3.5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#021024]/40 dark:text-white/40">Microphone</span>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              onClick={() => { setSelectedMicId(null); setPickerOpen(false); }}
              className={`flex w-full items-center px-3.5 py-2 text-sm transition-colors ${!selectedMicId ? "text-[#052659] font-medium dark:text-[#7DA0CA]" : "text-[#021024]/70 hover:bg-[#052659]/5 dark:text-white/70 dark:hover:bg-white/5"}`}
            >
              System default
            </button>
            {micDevices.length === 0 ? (
              <p className="px-3.5 py-2 text-xs text-[#021024]/40 dark:text-white/40">
                Grant microphone access to see available devices.
              </p>
            ) : (
              micDevices.map((d) => (
                <button
                  key={d.deviceId}
                  onClick={() => { setSelectedMicId(d.deviceId); setPickerOpen(false); }}
                  className={`flex w-full items-center truncate px-3.5 py-2 text-sm transition-colors ${selectedMicId === d.deviceId ? "text-[#052659] font-medium dark:text-[#7DA0CA]" : "text-[#021024]/70 hover:bg-[#052659]/5 dark:text-white/70 dark:hover:bg-white/5"}`}
                >
                  {d.label || "Microphone"}
                </button>
              ))
            )}
          </div>
      </DropdownPanel>
    </div>
  );
}

// ─── Redact / Edit modal ───────────────────────────────────────────────────

function RedactEditModal({ onClose }: { onClose: () => void }) {
  const { pendingSteps, project, refresh } = useSession();
  const [openStepId, setOpenStepId] = useState<string | null>(null);

  if (openStepId) {
    return (
      <RedactionOverlay
        stepId={openStepId}
        onDone={() => { setOpenStepId(null); refresh(); }}
        onReject={() => { setOpenStepId(null); refresh(); }}
        onClose={() => setOpenStepId(null)}
      />
    );
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#021024] dark:text-white">Redact / Edit SOP</h3>
        <button onClick={onClose} className="text-[#021024]/40 hover:text-[#021024] dark:text-white/40 dark:hover:text-white">
          <IconX />
        </button>
      </div>

      {pendingSteps.length > 0 ? (
        <PendingReviewQueue pending={pendingSteps} onChange={refresh} />
      ) : (
        <p className="rounded-lg border border-dashed border-[#7DA0CA]/40 p-6 text-center text-sm text-[#021024]/50 dark:text-white/50">
          Nothing needs redaction right now. The document is open live in Microsoft Word — edit it
          directly there; new steps will keep appending as you record.
        </p>
      )}

      {project && (
        <p className="mt-4 truncate text-xs text-[#021024]/35 dark:text-white/35">{project.word_file_path}</p>
      )}
    </Modal>
  );
}

// ─── Version History modal ─────────────────────────────────────────────────

function VersionHistoryModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { refresh } = useSession();
  return (
    <Modal onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#021024] dark:text-white">Version History</h3>
        <button onClick={onClose} className="text-[#021024]/40 hover:text-[#021024] dark:text-white/40 dark:hover:text-white">
          <IconX />
        </button>
      </div>
      <VersionHistoryPanel projectId={projectId} onRestored={refresh} />
    </Modal>
  );
}

// ─── SOP Library modal ──────────────────────────────────────────────────────

function LibraryModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<{ id: string; title: string; remote_url: string; published_at: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listLibrary().then((rows) => {
      setEntries(rows);
      setLoading(false);
    });
  }, []);

  return (
    <Modal onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-[#021024] dark:text-white">SOP Library</h3>
        <button onClick={onClose} className="text-[#021024]/40 hover:text-[#021024] dark:text-white/40 dark:hover:text-white">
          <IconX />
        </button>
      </div>

      {loading ? (
          <p className="text-sm text-[#021024]/40 dark:text-white/40">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#7DA0CA]/40 p-6 text-center text-sm text-[#021024]/50 dark:text-white/50">
            Nothing published yet. Use Publish → SOP Library (Local) on any SOP to add it here.
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-[#7DA0CA]/20 px-3.5 py-2.5 dark:border-white/10">
                <span className="truncate text-sm text-[#021024] dark:text-white">{e.title}</span>
                <a
                  href={api.libraryFileUrl(e.remote_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-3 shrink-0 rounded border border-[#7DA0CA]/40 px-2 py-1 text-xs font-medium text-[#052659] hover:bg-[#052659]/5 dark:text-[#7DA0CA] dark:border-white/20"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
    </Modal>
  );
}

// ─── Main Navbar ────────────────────────────────────────────────────────────

export default function Navbar() {
  const router = useRouter();
  const session = useSession();
  const { showToast } = useToast();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [redactOpen, setRedactOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS);

  const [storyName, setStoryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !createOpen && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setCreateOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [createOpen]);

  useEffect(() => {
    const handler = () => setCreateOpen(true);
    window.addEventListener("sop:create", handler);
    return () => window.removeEventListener("sop:create", handler);
  }, []);

  useEffect(() => {
    api.getSettings().then((s) => {
      const isDark = s.theme === "dark";
      setDark(isDark);
      document.documentElement.classList.toggle("dark", isDark);
    });
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    api.updateSettings({ theme: next ? "dark" : "light" }).catch(() => {});
  };

  const markAllRead = () => setNotifs((ns) => ns.map((n) => ({ ...n, read: true })));
  const unread = notifs.filter((n) => !n.read).length;

  const handleCreate = async () => {
    if (!storyName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const { project_id } = await api.startSession(storyName.trim());
      setCreateOpen(false);
      setStoryName("");
      setCreateError("");
      showToast("success", "Recording started — Word is opening");
      router.push(`/session/${project_id}`);
    } catch {
      setCreateError("Failed to start recording. Make sure the backend is running.");
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async () => {
    try {
      await session.startRecording();
      showToast("success", "Recording resumed");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to start recording");
    }
  };

  const handleStop = async () => {
    try {
      await session.stopRecording();
      showToast("info", "Recording stopped");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to stop recording");
    }
  };

  const handleSave = async () => {
    try {
      await session.saveNow();
      showToast("success", "Version saved");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save");
    }
  };

  const hasProject = !!session.project;

  return (
    <>
      <nav className="fixed inset-x-0 top-0 z-40 flex h-10 items-center justify-between bg-[#1E1E1E] px-4 text-xs font-medium text-gray-300 shadow-md">
        {/* Left: Logo and Tabs */}
        <div className="flex h-full items-center gap-1 overflow-x-auto no-scrollbar">
          <Link href="/" className="mr-3 flex shrink-0 items-center gap-1.5 text-[#C1E8FF] hover:text-white transition-colors">
            <svg width="14" height="14" viewBox="0 0 30 30" fill="none" aria-hidden>
              <circle cx="15" cy="15" r="10" stroke="currentColor" strokeWidth="4" />
              <circle cx="15" cy="15" r="4" fill="currentColor" />
            </svg>
          </Link>

          <Link href="/" className="flex h-full items-center gap-1.5 px-3 hover:bg-[#2D2D2D] hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/stories" className="flex h-full items-center gap-1.5 px-3 hover:bg-[#2D2D2D] hover:text-white transition-colors">
            Story
          </Link>
          
          <div className="mx-1 h-4 w-px bg-gray-700" />
          
          {/* Dropdown for other tools to keep navbar clean as requested */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setProfileOpen((o) => !o); setNotifOpen(false); }}
              className="flex h-full items-center gap-1.5 px-3 hover:bg-[#2D2D2D] hover:text-white transition-colors"
            >
              Tools <IconChevronDown />
            </button>
            <DropdownPanel
              open={profileOpen}
              className="absolute left-0 top-10 w-48 rounded bg-[#2D2D2D] border border-gray-700 shadow-xl overflow-hidden py-1 z-50 text-gray-300"
            >
              {["Process", "Video", "Audio", "Image", "Merge", "Frame", "Voice"].map(tool => (
                <button key={tool} className="flex w-full items-center px-4 py-2 hover:bg-[#3D3D3D] hover:text-white transition-colors text-left">
                  {tool}
                </button>
              ))}
            </DropdownPanel>
          </div>
        </div>

        {/* Right: Utility Icons */}
        <div className="flex h-full shrink-0 items-center gap-1">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}
              className="flex h-10 w-10 items-center justify-center hover:bg-[#2D2D2D] hover:text-white transition-colors"
            >
              <span className="text-base">!</span>
              {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />}
            </button>
            <DropdownPanel
              open={notifOpen}
              className="absolute right-0 top-10 w-64 rounded bg-[#2D2D2D] border border-gray-700 shadow-xl overflow-hidden z-50"
            >
              <div className="p-3 text-white border-b border-gray-700">Notifications</div>
              <div className="max-h-48 overflow-y-auto">
                {notifs.map((n) => (
                  <div key={n.id} className="p-3 border-b border-gray-700/50 hover:bg-[#3D3D3D] transition-colors">
                    <p className="text-white mb-1">{n.title}</p>
                    <p className="text-[10px] text-gray-400">{n.body}</p>
                  </div>
                ))}
              </div>
            </DropdownPanel>
          </div>

          <button className="flex h-10 w-10 items-center justify-center hover:bg-[#2D2D2D] hover:text-white transition-colors">
            <span className="text-base">?</span>
          </button>
          
          <Link href="/settings" className="flex h-10 w-10 items-center justify-center hover:bg-[#2D2D2D] hover:text-white transition-colors">
            <IconSettings />
          </Link>
          
          <button className="flex h-10 w-10 items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <IconX />
          </button>
        </div>
      </nav>

      {/* ── Create SOP Dialog ────────────────────────────────────────────── */}
      <AnimatePresence>
        {createOpen && (
          <Modal onClose={() => { setCreateOpen(false); setStoryName(""); setCreateError(""); }} maxWidth="max-w-[440px]">
            <div className="-m-5 overflow-hidden rounded-2xl">
            <div className="flex items-start justify-between border-b border-[#7DA0CA]/20 dark:border-white/10 px-6 py-5">
              <div>
                <h2 className="text-base font-semibold text-[#021024] dark:text-white">New SOP</h2>
                <p className="text-xs text-[#021024]/50 dark:text-white/50 mt-0.5">
                  Name it, then start working — the app opens Word and starts watching your screen.
                </p>
              </div>
              <button
                onClick={() => { setCreateOpen(false); setStoryName(""); setCreateError(""); }}
                className="rounded-lg p-1.5 text-[#021024]/35 hover:bg-[#052659]/5 hover:text-[#021024] transition-colors dark:text-white/35 dark:hover:bg-white/5 dark:hover:text-white -mt-0.5 -mr-1"
              >
                <IconX />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-[#021024]/70 dark:text-white/70">
                  SOP Name <span className="text-red-400">*</span>
                </label>
                <input
                  autoFocus
                  value={storyName}
                  onChange={(e) => setStoryName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="e.g. Resetting a customer's VPN access"
                  className="w-full rounded-lg border border-[#7DA0CA]/50 bg-white px-3 py-2.5 text-sm text-[#021024] placeholder:text-[#021024]/30 focus:border-[#052659] focus:outline-none focus:ring-2 focus:ring-[#052659]/10 transition-all dark:bg-[#021024]/40 dark:border-white/20 dark:text-white dark:placeholder:text-white/30 dark:focus:border-[#5483B3]"
                />
              </div>

              {createError && (
                <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400">
                  {createError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#7DA0CA]/20 dark:border-white/10 px-6 py-4">
              <p className="text-xs text-[#021024]/35 dark:text-white/35">
                Press <kbd className="rounded bg-[#052659]/8 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10">↵</kbd> to start
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setCreateOpen(false); setStoryName(""); setCreateError(""); }}
                  className="rounded-lg border border-[#7DA0CA]/40 px-4 py-2 text-sm font-medium text-[#021024]/65 hover:border-[#7DA0CA] hover:text-[#021024] transition-colors dark:text-white/65 dark:border-white/20 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!storyName.trim() || creating}
                  className="rounded-lg bg-[#052659] px-5 py-2 text-sm font-medium text-white hover:bg-[#021024] transition-colors disabled:opacity-40 shadow-sm"
                >
                  {creating ? "Starting…" : "Start Recording"}
                </button>
              </div>
            </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {redactOpen && <RedactEditModal onClose={() => setRedactOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {versionsOpen && session.project && (
          <VersionHistoryModal projectId={session.project.id} onClose={() => setVersionsOpen(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {libraryOpen && <LibraryModal onClose={() => setLibraryOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
