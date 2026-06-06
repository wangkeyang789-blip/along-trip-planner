"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TRTC as TRTCClient } from "trtc-sdk-v5";

type TRTCStatic = typeof import("trtc-sdk-v5").default;

type TrtcVoiceStatus =
  | "disabled"
  | "idle"
  | "joining"
  | "connected"
  | "leaving"
  | "error";

type UseTrtcVoiceInput = {
  roomCode: string;
  userId?: string;
  muted: boolean;
  enabled: boolean;
};

type UserSigResponse = {
  ready: boolean;
  sdkAppId: string;
  userId: string;
  userSig: string;
  expireAt: number;
  error?: string;
  missing?: string[];
};

type JoinAttemptResult =
  | { success: true }
  | { success: false; message: string; retryable: boolean };

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

function getBrowserName(): string {
  if (typeof window === "undefined") return "unknown";

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("360se") || userAgent.includes("360ee") || userAgent.includes("qihu")) {
    return "360";
  }
  if (userAgent.includes("micromessenger")) return "wechat";
  if (userAgent.includes("edg")) return "edge";
  if (userAgent.includes("chrome")) return "chrome";
  if (userAgent.includes("firefox")) return "firefox";
  if (userAgent.includes("safari")) return "safari";
  return "unknown";
}

function checkWebRtcSupport(): JoinAttemptResult {
  const browser = getBrowserName();

  if (browser === "360") {
    return {
      success: false,
      message: "360 浏览器暂不支持 TRTC 语音功能，已切换到浏览器语音识别",
      retryable: false,
    };
  }

  if (browser === "wechat") {
    return {
      success: false,
      message: "微信内置浏览器不支持 WebRTC 语音，请使用 Chrome 或 Edge 浏览器",
      retryable: false,
    };
  }

  if (typeof RTCPeerConnection === "undefined") {
    return {
      success: false,
      message: "当前浏览器不支持 WebRTC，无法使用 TRTC 语音",
      retryable: false,
    };
  }

  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      success: false,
      message: "当前浏览器不支持麦克风访问，请检查权限设置",
      retryable: false,
    };
  }

  try {
    const peerConnection = new RTCPeerConnection();
    peerConnection.createDataChannel?.("trtc-check");
    peerConnection.close();
  } catch {
    return {
      success: false,
      message: "当前浏览器 RTCPeerConnection 创建失败，请使用 Chrome 或 Edge",
      retryable: false,
    };
  }

  return { success: true };
}

function isRetryableTrtcError(message: string) {
  return ![
    "360",
    "微信",
    "WebRTC",
    "不支持",
    "麦克风访问",
    "TRTC_NOT_CONFIGURED",
    "UserSig 获取失败",
  ].some((keyword) => message.includes(keyword));
}

async function loadTrtcSdk(): Promise<TRTCStatic> {
  const sdkModule: unknown = await import("trtc-sdk-v5/trtc.esm.js").catch(() =>
    import("trtc-sdk-v5"),
  );
  const exports = sdkModule as { default?: TRTCStatic; TRTC?: TRTCStatic };
  const TRTC = exports.default || exports.TRTC || (sdkModule as TRTCStatic);

  if (!TRTC || typeof TRTC.create !== "function") {
    throw new Error("TRTC SDK 加载失败，请检查 SDK 版本");
  }

  return TRTC;
}

async function destroyTrtc(trtc: TRTCClient) {
  await trtc.stopLocalAudio().catch(() => undefined);
  await trtc.exitRoom().catch(() => undefined);
  trtc.destroy();
}

export function useTrtcVoice({
  roomCode,
  userId,
  muted,
  enabled,
}: UseTrtcVoiceInput) {
  const trtcRef = useRef<TRTCClient | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<TrtcVoiceStatus>(
    enabled ? "idle" : "disabled",
  );
  const [error, setError] = useState<string | null>(null);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current === null) return;
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
  }, []);

  useEffect(() => {
    setStatus((current) => {
      if (!enabled) return "disabled";
      if (current === "disabled") return "idle";
      return current;
    });

    if (!enabled) clearRetryTimer();
  }, [clearRetryTimer, enabled]);

  useEffect(() => {
    if (status !== "connected" || !trtcRef.current) return;

    void trtcRef.current.updateLocalAudio({ mute: muted }).catch(() => {
      console.warn("[TRTC] updateLocalAudio failed");
    });
  }, [muted, status]);

  const leave = useCallback(async () => {
    clearRetryTimer();

    const trtc = trtcRef.current;
    if (!trtc) {
      setStatus(enabled ? "idle" : "disabled");
      return;
    }

    setStatus("leaving");
    trtcRef.current = null;

    try {
      await destroyTrtc(trtc);
      setStatus(enabled ? "idle" : "disabled");
      setError(null);
    } catch (leaveError) {
      const message =
        leaveError instanceof Error ? leaveError.message : String(leaveError);
      console.warn("[TRTC] leave failed:", message);
      setError(`TRTC 离房失败：${message}`);
      setStatus("error");
    }
  }, [clearRetryTimer, enabled]);

  const performJoin = useCallback(async (): Promise<JoinAttemptResult> => {
    if (!enabled || !userId) {
      setStatus("disabled");
      return {
        success: false,
        message: "TRTC 未配置或用户未就绪",
        retryable: false,
      };
    }

    const compatibility = checkWebRtcSupport();
    if (!compatibility.success) {
      setError(compatibility.message);
      setStatus("error");
      return compatibility;
    }

    setStatus("joining");
    setError(null);

    try {
      const userSigResponse = await fetch("/api/trtc/usersig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const userSigData = (await userSigResponse.json()) as UserSigResponse;

      if (!userSigResponse.ok || !userSigData.ready) {
        throw new Error(
          userSigData.error ||
            `UserSig 获取失败：${userSigData.missing?.join(",") || "未知错误"}`,
        );
      }

      const TRTC = await loadTrtcSdk();
      const trtc = TRTC.create({ assetsPath: "/trtc-assets" });
      trtcRef.current = trtc;

      trtc.on(TRTC.EVENT.ERROR, (event) => {
        const payload = event as { code?: number; message?: string };
        const detail = payload.message || String(payload.code || "unknown");
        console.warn("[TRTC] SDK error event:", detail);

        if (detail.includes("connect failed") || detail.includes("reconnect")) {
          setError("浏览器语音连接失败，已切换到浏览器语音识别");
          setStatus("error");
        }
      });

      await trtc.enterRoom({
        autoReceiveAudio: true,
        autoReceiveVideo: false,
        enableAutoPlayDialog: true,
        scene: TRTC.TYPE.SCENE_RTC,
        sdkAppId: Number(userSigData.sdkAppId),
        strRoomId: roomCode,
        userId,
        userSig: userSigData.userSig,
      });
      await trtc.startLocalAudio({ mute: muted });

      setStatus("connected");
      setError(null);
      return { success: true };
    } catch (joinError) {
      const message =
        joinError instanceof Error ? joinError.message : String(joinError);
      console.warn("[TRTC] join attempt failed:", message);

      if (trtcRef.current) {
        const trtc = trtcRef.current;
        trtcRef.current = null;
        await destroyTrtc(trtc).catch(() => undefined);
      }

      setError(message);
      return {
        success: false,
        message,
        retryable: isRetryableTrtcError(message),
      };
    }
  }, [enabled, muted, roomCode, userId]);

  const retryJoin = useCallback(async () => {
    let latestFailure: JoinAttemptResult | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
      setStatus("joining");
      setError(`正在重新连接 (${attempt}/${MAX_RETRIES})...`);

      await new Promise<void>((resolve) => {
        retryTimerRef.current = setTimeout(resolve, RETRY_DELAY_MS * attempt);
      });
      retryTimerRef.current = null;

      const result = await performJoin();
      if (result.success) return;

      latestFailure = result;
      if (!result.retryable) {
        setStatus("error");
        return;
      }
    }

    setStatus("error");
    setError(
      latestFailure?.message ||
        "语音连接失败，请点击「加入语音」按钮重试",
    );
  }, [performJoin]);

  const join = useCallback(async () => {
    if (!enabled || !userId) {
      setStatus("disabled");
      return;
    }

    if (trtcRef.current && status === "connected") return;

    clearRetryTimer();
    const result = await performJoin();
    if (result.success || !result.retryable) return;

    await retryJoin();
  }, [clearRetryTimer, enabled, performJoin, retryJoin, status, userId]);

  useEffect(() => {
    return () => {
      clearRetryTimer();
      if (!trtcRef.current) return;

      const trtc = trtcRef.current;
      trtcRef.current = null;
      void destroyTrtc(trtc).catch(() => undefined);
    };
  }, [clearRetryTimer]);

  return {
    status,
    error,
    join,
    leave,
    isConnected: status === "connected",
    isJoining: status === "joining",
  };
}
