"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { AppSettings, SettingsDiagnostics } from "@/lib/types";
import { useToast } from "@/lib/ToastContext";

const PUBLISH_LABELS: Record<string, string> = {
  local_library: "SOP Library (Local)",
  sharepoint: "SharePoint",
  confluence: "Confluence",
  servicenow: "ServiceNow",
  salesforce: "Salesforce",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 items-start gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#021024] dark:text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-[#021024]/45 dark:text-white/45">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-[#7DA0CA]/20 bg-white p-5 shadow-sm dark:bg-[#052659]/40 dark:border-white/10"
    >
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-[#021024]/40 dark:text-white/40">{title}</h2>
      <div className="divide-y divide-[#7DA0CA]/10 dark:divide-white/8">{children}</div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<SettingsDiagnostics | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings);
    api.getSettingsDiagnostics().then(setDiagnostics);
  }, []);

  const save = async (patch: Partial<AppSettings>) => {
    setSaving(true);
    try {
      const updated = await api.updateSettings(patch);
      setSettings(updated);
      showToast("success", "Settings saved — takes effect on the next recording session");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return <main className="p-8 text-sm text-[#021024]/50 dark:text-white/50">Loading settings…</main>;
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#f0f7ff] dark:bg-[#021024]">
      <div className="border-b border-[#7DA0CA]/20 dark:border-white/8 bg-white/70 dark:bg-[#052659]/20 backdrop-blur-sm px-8 py-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-xl font-bold text-[#021024] dark:text-white tracking-tight">Settings</h1>
          <p className="mt-0.5 text-sm text-[#021024]/50 dark:text-white/50">
            App-wide configuration. Capture tuning applies to the next recording session you start.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl space-y-5 px-8 py-8">
        <Section title="Capture sensitivity">
          <Field label="Capture interval" hint="How often the screen is sampled, in seconds.">
            <input
              type="number"
              min={0.2}
              step={0.1}
              defaultValue={settings.capture_interval_sec}
              onBlur={(e) => save({ capture_interval_sec: Number(e.target.value) })}
              className="w-28 rounded border border-line px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Motion sensitivity" hint="Lower = triggers on smaller on-screen changes.">
            <input
              type="number"
              min={0.0005}
              max={0.05}
              step={0.0005}
              defaultValue={settings.capture_motion_ratio}
              onBlur={(e) => save({ capture_motion_ratio: Number(e.target.value) })}
              className="w-28 rounded border border-line px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Change threshold" hint="How different a settled frame must be from the last capture to be kept.">
            <input
              type="number"
              min={0.005}
              max={0.2}
              step={0.005}
              defaultValue={settings.capture_diff_threshold}
              onBlur={(e) => save({ capture_diff_threshold: Number(e.target.value) })}
              className="w-28 rounded border border-line px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Settle time" hint="Seconds of no motion before a frame is considered stable enough to capture.">
            <input
              type="number"
              min={0.1}
              step={0.1}
              defaultValue={settings.capture_settle_sec}
              onBlur={(e) => save({ capture_settle_sec: Number(e.target.value) })}
              className="w-28 rounded border border-line px-2 py-1.5 text-sm"
            />
          </Field>
        </Section>

        <Section title="Defaults">
          <Field label="Default document type" hint="Used for new SOPs unless overridden.">
            <input
              type="text"
              defaultValue={settings.default_doc_type}
              onBlur={(e) => save({ default_doc_type: e.target.value || "sop" })}
              className="w-48 rounded border border-line px-2 py-1.5 text-sm"
            />
          </Field>
        </Section>

        <Section title="Version history">
          <Field
            label="Auto-snapshot every"
            hint="Automatically saves a version snapshot after this many steps are inserted. Set to 0 to disable and only snapshot manually."
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                step={1}
                defaultValue={settings.auto_snapshot_every_n_steps}
                onBlur={(e) => save({ auto_snapshot_every_n_steps: Math.max(0, Number(e.target.value)) })}
                className="w-28 rounded border border-line px-2 py-1.5 text-sm"
              />
              <span className="text-sm text-[#021024]/50 dark:text-white/50">steps</span>
            </div>
          </Field>
        </Section>

        <Section title="Diagnostics (read-only)">
          <Field label="Gemini Vision">
            {diagnostics ? (
              <span className={diagnostics.gemini_configured ? "text-emerald-600 dark:text-emerald-400" : "text-recording"}>
                {diagnostics.gemini_configured ? `Configured (${diagnostics.gemini_vision_model})` : "Not configured — set GEMINI_API_KEY"}
              </span>
            ) : (
              <span className="text-[#021024]/40 dark:text-white/40">Loading…</span>
            )}
          </Field>
          <Field label="Gemini Instruction Writing">
            {diagnostics ? (
              <span className={diagnostics.gemini_configured ? "text-emerald-600 dark:text-emerald-400" : "text-recording"}>
                {diagnostics.gemini_configured ? `Configured (${diagnostics.gemini_text_model})` : "Not configured — set GEMINI_API_KEY"}
              </span>
            ) : (
              <span className="text-[#021024]/40 dark:text-white/40">Loading…</span>
            )}
          </Field>
          <Field label="Voice transcription">
            <span className="text-[#021024]/70 dark:text-white/70">faster-whisper ({diagnostics?.whisper_model ?? "…"})</span>
          </Field>
          <Field label="Publish targets">
            <ul className="space-y-1">
              {diagnostics?.publish_targets.map((t) => (
                <li key={t.provider} className="flex items-center justify-between text-sm">
                  <span className="text-[#021024]/70 dark:text-white/70">{PUBLISH_LABELS[t.provider] ?? t.provider}</span>
                  <span className={t.configured ? "text-emerald-600 dark:text-emerald-400" : "text-[#021024]/35 dark:text-white/35"}>
                    {t.configured ? "Configured" : "Not configured"}
                  </span>
                </li>
              ))}
            </ul>
          </Field>
        </Section>

        {saving && <p className="text-xs text-[#021024]/40 dark:text-white/40">Saving…</p>}
      </div>
    </main>
  );
}
