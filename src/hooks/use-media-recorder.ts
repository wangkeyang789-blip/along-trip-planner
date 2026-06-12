"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "stopped" | "error";

export function useMediaRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      setDuration(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : MediaRecorder.isTypeSupported("audio/mp4")
              ? "audio/mp4"
              : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setStatus("stopped");
        // Stop all tracks to release microphone
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.onerror = () => {
        setError("录音出现异常");
        setStatus("error");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
      startTimeRef.current = Date.now();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } catch (err) {
      const msg =
        err instanceof DOMException
          ? err.name === "NotAllowedError"
            ? "麦克风权限未开启"
            : err.name === "NotFoundError"
              ? "未检测到可用麦克风"
              : "录音启动失败"
          : "录音启动失败";
      setError(msg);
      setStatus("error");
    }
  }, [clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    mediaRecorderRef.current = null;
  }, [clearTimer]);

  const clear = useCallback(() => {
    clearTimer();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
    setStatus("idle");
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, [audioUrl, clearTimer]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current) {
        try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
      }
    };
  }, [audioUrl, clearTimer]);

  return {
    status,
    audioBlob,
    audioUrl,
    duration,
    error,
    isRecording: status === "recording",
    isStopped: status === "stopped",
    start,
    stop,
    clear,
  };
}
