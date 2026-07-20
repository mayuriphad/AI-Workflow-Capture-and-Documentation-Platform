"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
import type { KeyPointsResult, Project, SessionStatus, Step } from "./types";

interface SessionContextValue {
  project: Project | null;
  status: SessionStatus | null;
  pendingSteps: Step[];
  setActiveProjectId: (id: string | null) => void;
  refresh: () => void;

  recording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  actionBusy: boolean;
  actionError: string | null;

  isDictating: boolean;
  isExtractingKeyPoints: boolean;
  micDevices: MediaDeviceInfo[];
  selectedMicId: string | null;
  setSelectedMicId: (id: string | null) => void;
  refreshMicDevices: () => void;
  startDictation: () => Promise<void>;
  stopDictation: () => void;
  startKeyPointsCapture: () => Promise<void>;
  stopKeyPointsCapture: () => void;
  lastKeyPoints: KeyPointsResult | null;
  dictationError: string | null;

  saving: boolean;
  saveNow: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const POLL_MS = 3000;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [isDictating, setIsDictating] = useState(false);
  const [isExtractingKeyPoints, setIsExtractingKeyPoints] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [lastKeyPoints, setLastKeyPoints] = useState<KeyPointsResult | null>(null);
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const refresh = useCallback(() => {
    if (!projectId) return;
    api.getProject(projectId).then(setProject).catch(() => {});
    api.getSessionStatus(projectId).then(setStatus).catch(() => setStatus(null));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setStatus(null);
      return;
    }
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [projectId, refresh]);

  const startRecording = useCallback(async () => {
    if (!projectId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await api.resumeSession(projectId);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start recording";
      setActionError(message);
      throw new Error(message);
    } finally {
      setActionBusy(false);
    }
  }, [projectId, refresh]);

  const stopRecording = useCallback(async () => {
    if (!projectId) return;
    setActionBusy(true);
    setActionError(null);
    try {
      await api.stopSession(projectId);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to stop recording";
      setActionError(message);
      throw new Error(message);
    } finally {
      setActionBusy(false);
    }
  }, [projectId, refresh]);

  const refreshMicDevices = useCallback(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setMicDevices(devices.filter((d) => d.kind === "audioinput"));
    });
  }, []);

  const captureAudioClip = useCallback(
    async (onStopped: (blob: Blob) => Promise<void>, onStarted: () => void, onEnded: () => void) => {
      const audioConstraint: boolean | MediaTrackConstraints = selectedMicId
        ? { deviceId: { exact: selectedMicId } }
        : true;
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      refreshMicDevices(); // labels only populate after permission is granted once

      const recorder = new MediaRecorder(micStream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        micStream.getTracks().forEach((t) => t.stop());
        try {
          await onStopped(blob);
        } catch (err) {
          setDictationError(err instanceof Error ? err.message : "Voice processing failed");
        } finally {
          onEnded();
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      onStarted();
    },
    [selectedMicId, refreshMicDevices]
  );

  const startDictation = useCallback(async () => {
    if (!projectId) return;
    setDictationError(null);
    try {
      await captureAudioClip(
        async (blob) => {
          await api.submitVoiceNote(projectId, blob);
          refresh();
        },
        () => setIsDictating(true),
        () => setIsDictating(false)
      );
    } catch (err) {
      setDictationError(err instanceof Error ? err.message : "Couldn't access the microphone");
    }
  }, [projectId, captureAudioClip, refresh]);

  const stopDictation = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const startKeyPointsCapture = useCallback(async () => {
    if (!projectId) return;
    setDictationError(null);
    setLastKeyPoints(null);
    try {
      await captureAudioClip(
        async (blob) => {
          const result = await api.extractKeyPoints(projectId, blob);
          setLastKeyPoints(result);
          refresh();
        },
        () => setIsExtractingKeyPoints(true),
        () => setIsExtractingKeyPoints(false)
      );
    } catch (err) {
      setDictationError(err instanceof Error ? err.message : "Couldn't access the microphone");
    }
  }, [projectId, captureAudioClip, refresh]);

  const stopKeyPointsCapture = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  const saveNow = useCallback(async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      await api.createSnapshot(projectId, "manual");
      refresh();
    } finally {
      setSaving(false);
    }
  }, [projectId, refresh]);

  const pendingSteps = (project?.steps ?? []).filter((s) => s.review_status === "pending_review");

  return (
    <SessionContext.Provider
      value={{
        project,
        status,
        pendingSteps,
        setActiveProjectId: setProjectId,
        refresh,
        recording: status?.recording ?? false,
        startRecording,
        stopRecording,
        actionBusy,
        actionError,
        isDictating,
        isExtractingKeyPoints,
        micDevices,
        selectedMicId,
        setSelectedMicId,
        refreshMicDevices,
        startDictation,
        stopDictation,
        startKeyPointsCapture,
        stopKeyPointsCapture,
        lastKeyPoints,
        dictationError,
        saving,
        saveNow,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
