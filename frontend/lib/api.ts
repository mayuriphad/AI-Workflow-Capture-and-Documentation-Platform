import type {
  AnalyticsSummary,
  AppSettings,
  KeyPointsResult,
  LibraryEntry,
  Project,
  ProjectSummary,
  PublishHistoryEntry,
  PublishResult,
  PublishTarget,
  RedactionBox,
  SessionStatus,
  SettingsDiagnostics,
  Step,
  VersionInfo,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function postJson<T>(path: string, body: unknown): Promise<T> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => json<T>(r));
}

export const api = {
  // projects
  listProjects: (): Promise<ProjectSummary[]> =>
    fetch(`${API_BASE}/projects`).then((r) => json<ProjectSummary[]>(r)),

  getProject: (projectId: string): Promise<Project> =>
    fetch(`${API_BASE}/projects/${projectId}`).then((r) => json<Project>(r)),

  deleteProject: (projectId: string) =>
    fetch(`${API_BASE}/projects/${projectId}`, { method: "DELETE" }).then((r) => json<{ ok: boolean }>(r)),

  // sessions
  startSession: (title: string, docType = "sop") =>
    postJson<{ project_id: string; session_id: string }>("/sessions/start", { title, doc_type: docType }),

  stopSession: (projectId: string) =>
    postJson<{ ok: boolean }>(`/sessions/${projectId}/stop`, {}),

  resumeSession: (projectId: string) =>
    postJson<{ project_id: string; session_id: string }>(`/sessions/${projectId}/resume`, {}),

  getSessionStatus: (projectId: string): Promise<SessionStatus> =>
    fetch(`${API_BASE}/sessions/${projectId}/status`).then((r) => json<SessionStatus>(r)),

  submitVoiceNote: (projectId: string, blob: Blob) => {
    const form = new FormData();
    form.append("file", blob, "clip.webm");
    return fetch(`${API_BASE}/sessions/${projectId}/voice-note`, { method: "POST", body: form }).then((r) =>
      json<{ step_id: string; text: string }>(r)
    );
  },

  submitManualNote: (projectId: string, text: string, targetStepId?: string) =>
    postJson<{ step_id: string }>(`/sessions/${projectId}/manual-note`, {
      text,
      target_step_id: targetStepId ?? null,
    }),

  voiceNotesExportUrl: (projectId: string) => `${API_BASE}/sessions/${projectId}/voice-notes/export`,

  extractKeyPoints: (projectId: string, blob: Blob): Promise<KeyPointsResult> => {
    const form = new FormData();
    form.append("file", blob, "clip.webm");
    return fetch(`${API_BASE}/sessions/${projectId}/voice-note/key-points`, { method: "POST", body: form }).then(
      (r) => json<KeyPointsResult>(r)
    );
  },

  // steps (already-inserted content: delete / replace / redact-in-place / add)
  deleteStep: (stepId: string) =>
    fetch(`${API_BASE}/steps/${stepId}`, { method: "DELETE" }).then((r) => json<{ ok: boolean }>(r)),

  replaceStepImage: (stepId: string, file: File | Blob) => {
    const form = new FormData();
    form.append("file", file, "replacement.png");
    return fetch(`${API_BASE}/steps/${stepId}/replace-image`, { method: "POST", body: form }).then((r) =>
      json<{ ok: boolean; screenshot_final_path: string }>(r)
    );
  },

  editStepImage: (stepId: string, boxes: RedactionBox[], mode: "blackbox" | "blur" | "annotate" = "blackbox") =>
    postJson<{ ok: boolean; screenshot_final_path: string }>(`/steps/${stepId}/edit-image`, { boxes, mode }),

  updateStepText: (stepId: string, instruction: string) =>
    fetch(`${API_BASE}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction }),
    }).then((r) => json<{ ok: boolean; instruction: string }>(r)),

  addImageStep: (projectId: string, instruction: string, file: File | Blob, afterStepId?: string | null) => {
    const form = new FormData();
    form.append("project_id", projectId);
    form.append("instruction", instruction);
    if (afterStepId) form.append("after_step_id", afterStepId);
    form.append("file", file, "image.png");
    return fetch(`${API_BASE}/steps/add`, { method: "POST", body: form }).then((r) =>
      json<{ step_id: string; screenshot_final_path: string }>(r)
    );
  },

  // review (pending redaction queue)
  listPending: (projectId: string): Promise<Step[]> =>
    fetch(`${API_BASE}/review/pending?project_id=${projectId}`).then((r) => json<Step[]>(r)),

  getReviewSuggestions: (stepId: string) =>
    fetch(`${API_BASE}/review/${stepId}/suggestions`).then((r) =>
      json<{ step_id: string; screenshot: string; suggestions: RedactionBox[] }>(r)
    ),

  approveStep: (stepId: string, boxes: RedactionBox[], mode: "blackbox" | "blur" | "annotate" = "blackbox") =>
    postJson<{ ok: boolean; screenshot_final_path: string }>(`/review/${stepId}/approve`, { boxes, mode }),

  rejectStep: (stepId: string) => postJson<{ ok: boolean }>(`/review/${stepId}/reject`, {}),

  // versions
  listVersions: (projectId: string): Promise<VersionInfo[]> =>
    fetch(`${API_BASE}/versions/${projectId}`).then((r) => json<VersionInfo[]>(r)),

  createSnapshot: (projectId: string, label = "manual") =>
    postJson<VersionInfo>(`/versions/${projectId}/snapshot`, { label }),

  restoreVersion: (projectId: string, versionId: string) =>
    postJson<{ ok: boolean; word_file_path: string }>(`/versions/${projectId}/restore/${versionId}`, {}),

  // publish
  listPublishTargets: (): Promise<PublishTarget[]> =>
    fetch(`${API_BASE}/publish/targets`).then((r) => json<PublishTarget[]>(r)),

  publish: (projectId: string, provider: string) =>
    postJson<PublishResult>(`/publish/${projectId}/${provider}`, {}),

  listPublishHistory: (projectId: string): Promise<PublishHistoryEntry[]> =>
    fetch(`${API_BASE}/publish/${projectId}/history`).then((r) => json<PublishHistoryEntry[]>(r)),

  listLibrary: (): Promise<LibraryEntry[]> =>
    fetch(`${API_BASE}/publish/library/list`).then((r) => json<LibraryEntry[]>(r)),

  libraryFileUrl: (remoteUrl: string) => `${API_BASE}${remoteUrl}`,

  // export
  exportUrl: (projectId: string, fmt: "docx" | "pdf" | "html" | "md") => `${API_BASE}/export/${projectId}/${fmt}`,

  // screenshots (raw + redacted captures, relative to the /screenshots mount)
  screenshotUrl: (relativePath: string) => `${API_BASE}/screenshots/${relativePath}`,

  // analytics
  getAnalyticsSummary: (): Promise<AnalyticsSummary> =>
    fetch(`${API_BASE}/analytics/summary`).then((r) => json<AnalyticsSummary>(r)),

  // settings
  getSettings: (): Promise<AppSettings> => fetch(`${API_BASE}/settings`).then((r) => json<AppSettings>(r)),

  updateSettings: (patch: Partial<AppSettings>): Promise<AppSettings> =>
    fetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<AppSettings>(r)),

  getSettingsDiagnostics: (): Promise<SettingsDiagnostics> =>
    fetch(`${API_BASE}/settings/diagnostics`).then((r) => json<SettingsDiagnostics>(r)),
};
