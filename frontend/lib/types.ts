export type StepKind = "screenshot_step" | "voice_note" | "manual_note";
export type ReviewStatus = "pending_review" | "approved" | "rejected" | "auto_inserted";
export type ProjectStatus = "active" | "stopped" | "archived";

export interface RedactionBox {
  left: number;
  top: number;
  width: number;
  height: number;
  label?: string;
}

export interface Step {
  id: string;
  project_id: string;
  session_id: string | null;
  position: number;
  kind: StepKind;
  instruction: string | null;
  screenshot_raw_path: string | null;
  screenshot_final_path: string | null;
  audio_path: string | null;
  sensitive_flag: number;
  redaction_boxes: RedactionBox[];
  review_status: ReviewStatus;
  word_bookmark: string | null;
  created_at: number;
}

export interface Project {
  id: string;
  title: string;
  doc_type: string;
  status: ProjectStatus;
  word_file_path: string;
  created_at: number;
  updated_at: number;
  steps: Step[];
}

export interface ProjectSummary {
  id: string;
  title: string;
  doc_type: string;
  status: ProjectStatus;
  created_at: number;
  updated_at: number;
  step_count: number;
  pending_count: number;
}

export interface SessionStatus {
  recording: boolean;
  monitor_running: boolean;
  word_alive: boolean;
  word_project_id: string | null;
  pending_count: number;
  last_error: string | null;
  processing: boolean;
}

export interface KeyPoint {
  step_id: string;
  text: string;
  attached_to_step_id: string | null;
}

export interface KeyPointsResult {
  transcript: string;
  key_points: KeyPoint[];
}

export interface LibraryEntry {
  id: string;
  title: string;
  doc_type: string;
  status: ProjectStatus;
  remote_url: string;
  published_at: number;
}

export interface AnalyticsActivityItem {
  id: string;
  kind: StepKind;
  instruction: string | null;
  created_at: number;
  review_status: ReviewStatus;
  project_title: string;
  project_id: string;
}

export interface AnalyticsSummary {
  total_projects: number;
  projects_by_status: Record<string, number>;
  total_steps: number;
  total_voice_notes: number;
  total_manual_notes: number;
  sensitive_frames_flagged: number;
  steps_pending_review: number;
  steps_rejected: number;
  total_versions: number;
  publishes_by_provider: Record<string, number>;
  recent_activity: AnalyticsActivityItem[];
}

export interface AppSettings {
  capture_interval_sec: number;
  capture_motion_ratio: number;
  capture_diff_threshold: number;
  capture_settle_sec: number;
  default_doc_type: string;
  theme: "light" | "dark";
}

export interface SettingsDiagnostics {
  gemini_configured: boolean;
  gemini_vision_model: string;
  gemini_text_model: string;
  whisper_model: string;
  publish_targets: PublishTarget[];
}

export interface VersionInfo {
  id: string;
  project_id: string;
  version_number: number;
  file_path: string;
  label: string;
  created_at: number;
}

export interface PublishTarget {
  provider: string;
  configured: boolean;
}

export interface PublishResult {
  success: boolean;
  remote_url: string | null;
  error: string | null;
}

export interface PublishHistoryEntry {
  id: string;
  project_id: string;
  provider: string;
  status: "success" | "failed";
  remote_url: string | null;
  error: string | null;
  created_at: number;
}
