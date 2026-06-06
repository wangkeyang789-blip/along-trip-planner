"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechStatus = "idle" | "listening" | "error" | "unsupported";
type SpeechSupportStatus = "checking" | "supported" | "unsupported";

type UserAgentDataLike = {
  brands?: { brand: string; version?: string }[];
};

function getBrowserSignature() {
  if (typeof navigator === "undefined") return "";

  const userAgentData = (navigator as Navigator & {
    userAgentData?: UserAgentDataLike;
  }).userAgentData;
  const brands = userAgentData?.brands?.map((item) => item.brand).join(" ") || "";
  return `${navigator.userAgent} ${navigator.vendor || ""} ${brands}`.toLowerCase();
}

function speechErrorMessage(error: SpeechRecognitionErrorCode) {
  if (error === "network") {
    return "浏览器语音识别服务暂时不可用，正在自动重试…";
  }
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "麦克风权限未开启，请允许浏览器使用麦克风";
  }
  if (error === "audio-capture") {
    return "没有检测到可用麦克风";
  }
  if (error === "no-speech") {
    return "没有识别到语音，请再说一次";
  }
  return `语音识别错误：${error}`;
}

function shouldStopAfterError(error: SpeechRecognitionErrorCode) {
  return ["audio-capture", "not-allowed", "service-not-allowed"].includes(error);
}

export function useWebSpeech() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const shouldRestartRef = useRef(false);
  const stoppedByUserRef = useRef(false);
  const startedAtRef = useRef(0);
  const resultCountRef = useRef(0);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const networkErrorCountRef = useRef(0);
  const maxNetworkRetries = useRef(3);
  const lastResultTimeRef = useRef(0);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [supportStatus, setSupportStatus] = useState<SpeechSupportStatus>("checking");
  const [transcript, setTranscript] = useState<string>("");
  const [interimText, setInterimText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [needsFallback, setNeedsFallback] = useState(false);

  const clearHintTimer = useCallback(() => {
    if (hintTimerRef.current === null) return;
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = null;
  }, []);

  const scheduleNoResultHint = useCallback(() => {
    clearHintTimer();
    hintTimerRef.current = setTimeout(() => {
      if (resultCountRef.current > 0) return;
      setHint("正在听，但还没收到转写结果。请确认麦克风有声音。");
    }, 10000);
  }, [clearHintTimer]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupportStatus("unsupported");
      return;
    }

    // Quick connectivity probe: start then stop within 500ms.
    // If a network error fires, mark unsupported immediately so China users
    // never see the Web Speech option.
    let probeTimer: ReturnType<typeof setTimeout> | null = null;
    let cleanedUp = false;

    const probe = new SpeechRecognition();
    probe.continuous = false;
    probe.interimResults = false;
    probe.lang = "zh-CN";

    probe.onerror = (event) => {
      if (cleanedUp) return;
      if (event.error === "network") {
        setSupportStatus("unsupported");
      } else {
        // Other errors (not-allowed, no-speech, etc.) don't imply lack of support
        setSupportStatus("supported");
      }
      cleanedUp = true;
      if (probeTimer) clearTimeout(probeTimer);
      try { probe.stop(); } catch { /* ignore */ }
    };

    (probe as any).onstart = () => {
      probeTimer = setTimeout(() => {
        if (cleanedUp) return;
        cleanedUp = true;
        setSupportStatus("supported");
        try { probe.stop(); } catch { /* ignore */ }
      }, 500);
    };

    (probe as any).onend = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (probeTimer) clearTimeout(probeTimer);
      setSupportStatus("supported");
    };

    try {
      probe.start();
    } catch {
      setSupportStatus("unsupported");
    }

    return () => {
      cleanedUp = true;
      if (probeTimer) clearTimeout(probeTimer);
      try { probe.stop(); } catch { /* ignore */ }
    };
  }, []);

  const start = useCallback(() => {
    if (supportStatus === "checking") {
      setError("语音识别正在初始化，请稍后再试");
      setHint("正在检测浏览器语音能力…");
      return;
    }
    if (supportStatus === "unsupported") {
      setStatus("unsupported");
      setError("当前浏览器不支持语音识别，请使用 Chrome 或 Edge");
      return;
    }

    // If already running, don't create another
    if (recognitionRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus("unsupported");
      setError("当前浏览器不支持语音识别，请使用 Chrome 或 Edge");
      setNeedsFallback(true);
      return;
    }

    stoppedByUserRef.current = false;
    shouldRestartRef.current = true;
    setNeedsFallback(false);
    setHint(null);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Got a result, reset network error counter
      networkErrorCountRef.current = 0;
      let finalText = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      lastResultTimeRef.current = Date.now();
      if (finalText) {
        resultCountRef.current += 1;
        setTranscript((prev) => (prev ? prev + finalText : finalText));
        setInterimText("");
      }
      if (interim) {
        resultCountRef.current += 1;
        setHint(null);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      const message = speechErrorMessage(event.error);
      if (event.error !== "no-speech") {
        console.warn("[WebSpeech] error:", event.error);
      }

      if (event.error === "network") {
        // Network error is very common in China. Keep retrying with backoff.
        networkErrorCountRef.current += 1;
        setHint(`语音服务暂时不可用（第${networkErrorCountRef.current}次），自动重试中…`);
        // Don't clear interim text so user can still see what was transcribed
        setStatus("error");
        if (networkErrorCountRef.current >= maxNetworkRetries.current) {
          setNeedsFallback(true);
        }
        // onend will handle restart
        return;
      }

      // Non-network error
      networkErrorCountRef.current = 0;
      setError(message);
      setInterimText("");
      setStatus("error");

      if (shouldStopAfterError(event.error)) {
        shouldRestartRef.current = false;
        recognitionRef.current = null;
        setNeedsFallback(true);
        try { recognition.stop(); } catch { /* ignore */ }
      }
    };

    recognition.onend = () => {
      clearHintTimer();
      // Clear the ref so start() can create a fresh instance later
      recognitionRef.current = null;

      if (stoppedByUserRef.current) {
        shouldRestartRef.current = false;
        setStatus("idle");
        return;
      }

      if (!shouldRestartRef.current) {
        setStatus("idle");
        return;
      }

      // Auto-restart with exponential backoff
      // Google speech servers in China are unstable, so always retry.
      const backoff = Math.min(2000 * Math.pow(1.5, networkErrorCountRef.current), 15000);
      const restartDelay = networkErrorCountRef.current > 0 ? backoff : 800;
      setTimeout(() => {
        if (!shouldRestartRef.current) return;
        // After max retries, stop auto-restarting
        if (networkErrorCountRef.current >= maxNetworkRetries.current) {
          shouldRestartRef.current = false;
          setStatus("idle");
          setNeedsFallback(true);
          setHint("语音服务暂不可用，请稍后重新点击麦克风按钮");
          return;
        }
        // Call start() again – it will create a fresh SpeechRecognition instance
        // since we cleared recognitionRef.current above
        start();
      }, restartDelay);
    };

    recognitionRef.current = recognition;
    try {
      startedAtRef.current = Date.now();
      networkErrorCountRef.current = 0;
      recognition.start();
      scheduleNoResultHint();
      setStatus("listening");
      setError(null);
      setHint(null);
    } catch (startError) {
      shouldRestartRef.current = false;
      recognitionRef.current = null;
      setStatus("error");
      setError(
        startError instanceof Error ? startError.message : "语音识别启动失败",
      );
    }
  }, [clearHintTimer, scheduleNoResultHint, supportStatus]);

  const stop = useCallback(() => {
    stoppedByUserRef.current = true;
    shouldRestartRef.current = false;
    clearHintTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    setStatus("idle");
    networkErrorCountRef.current = 0;
  }, []);

  const clear = useCallback(() => {
    setTranscript("");
    setInterimText("");
    setError(null);
    setHint(null);
    setNeedsFallback(false);
  }, []);

  useEffect(() => {
    return () => {
      clearHintTimer();
      stoppedByUserRef.current = true;
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
    };
  }, [clearHintTimer]);

  return {
    status,
    transcript,
    interimText,
    error,
    hint,
    isReady: supportStatus !== "checking",
    isSupported: supportStatus === "supported",
    isListening: status === "listening",
    needsFallback,
    start,
    stop,
    clear,
  };
}
