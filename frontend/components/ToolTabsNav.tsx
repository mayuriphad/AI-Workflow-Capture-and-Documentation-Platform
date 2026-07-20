"use client";

import Link from "next/link";

// Shared left-side nav cluster (logo + Home/Story links + decorative tool
// tabs + recording dot) used by both the global Navbar (every route except
// session pages) and SessionTopBar, so the two stay visually identical
// instead of drifting into two different-looking apps.

function IconSearch() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconWalk() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="13" cy="4" r="2" /><path d="M9 20l2-6 2 2 2 6M7 12l2-4 3 1 3-1M11 6l-2 3" />
    </svg>
  );
}
function IconVideo() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}
function IconAudio() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
    </svg>
  );
}
function IconMerge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V3M12 12v9M8 21h8" />
    </svg>
  );
}
function IconFrame() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14" />
    </svg>
  );
}
function IconMic() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// Process/Video/Audio/Image/Merge/Frame/Voice have no dedicated pages yet --
// same decorative tab affordance as before, just no longer hidden in a
// dropdown, and shared between both nav bars.
const DECORATIVE_TABS: { label: string; icon: React.ReactNode }[] = [
  { label: "Process", icon: <IconWalk /> },
  { label: "Video", icon: <IconVideo /> },
  { label: "Audio", icon: <IconAudio /> },
  { label: "Image", icon: <IconImage /> },
  { label: "Merge", icon: <IconMerge /> },
  { label: "Frame", icon: <IconFrame /> },
  { label: "Voice", icon: <IconMic /> },
];

const TAB_CLASS = "flex shrink-0 items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors";

export default function ToolTabsNav() {
  return (
    <div className="flex h-full items-center gap-3 overflow-x-auto no-scrollbar">
      <Link href="/" className="mr-1 flex shrink-0 items-center gap-1.5 text-[#C1E8FF] hover:text-white transition-colors">
        <svg width="14" height="14" viewBox="0 0 30 30" fill="none" aria-hidden>
          <circle cx="15" cy="15" r="10" stroke="currentColor" strokeWidth="4" />
          <circle cx="15" cy="15" r="4" fill="currentColor" />
        </svg>
      </Link>
      <Link href="/" className={TAB_CLASS}>
        <IconSearch /> Home
      </Link>
      <Link href="/stories" className={TAB_CLASS}>
        <IconDoc /> Story
      </Link>
      {DECORATIVE_TABS.map(({ label, icon }) => (
        <button key={label} className={TAB_CLASS}>
          {icon}
          {label}
        </button>
      ))}
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5EC9C0]" title="Recording" />
    </div>
  );
}
