"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TRTC as TRTCClient } from "trtc-sdk-v5";

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
};

export function useTrtcVoice({
  roomCode,
  userId,
  muted,
  enabled,
}: UseTrtcVoiceInput) {
  const trtcRef = useRef<TRTCClient | null>(null);
  const transcriberRobotIdRef = useRef<string | null>(null);
  const [status, setStatus] = useState<TrtcVoiceStatus>(
    enabled ? "idle" : "disabled",
  );
  const [error, setError] = useState<string | null>(null);
  const [lastTranscriberText, setLastTranscriberText] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setStatus((current) => {
      if (!enabled) return "disabled";
      if (current === "disabled") return "idle";
      return current;
    });
  }, [enabled]);

  useEffect(() => {
    if (status !== "connected" || !trtcRef.current) return;

    void trtcRef.current.updateLocalAudio({ mute: muted }).catch(() => {
      setError("TRTC 麦克风状态更新失败");
      setStatus("error");
    });
  }, [muted, status]);

  const leave = useCallback(async () => {
    const trtc = trtcRef.current;
    if (!trtc) {
      setStatus(enabled ? "idle" : "disabled");
      return;
    }

    setStatus("leaving");
    try {
      if (transcriberRobotIdRef.current) {
        await trtc
          .stopPlugin("RealtimeTranscriber", {
            transcriberRobotId: transcriberRobotIdRef.current,
          })
          .catch(() => undefined);
        transcriberRobotIdRef.current = null;
      }
      await trtc.stopLocalAudio().catch(() => undefined);
      await trtc.exitRoom().catch(() => undefined);
      trtc.destroy();
      trtcRef.current = null;
      setStatus(enabled ? "idle" : "disabled");
      setError(null);
    } catch {
      setError("TRTC 离房失败");
      setStatus("error");
    }
  }, [enabled]);

  const join = useCallback(async () => {
    if (!enabled || !userId) {
      setStatus("disabled");
      return;
    }
    if (trtcRef.current) {
      setStatus("connected");
      return;
    }

    setStatus("joining");
    setError(null);

    try {
      const userSigResponse = await fetch("/api/trtc/usersig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const userSig = (await userSigResponse.json()) as UserSigResponse & {
        error?: string;
        missing?: string[];
      };

      if (!userSigResponse.ok || !userSig.ready) {
        throw new Error(userSig.error || userSig.missing?.join(","));
      }

      const [{ TRTC }, { RealtimeTranscriber }] = await Promise.all([
        import("trtc-sdk-v5"),
        import("trtc-sdk-v5/plugins/realtime-transcriber"),
      ]);
      const trtc = TRTC.create({ plugins: [RealtimeTranscriber] });
      trtcRef.current = trtc;

      trtc.on(TRTC.EVENT.ERROR, () => {
        setError("TRTC 连接异常");
        setStatus("error");
      });
      trtc.on(TRTC.EVENT.REALTIME_TRANSCRIBER_MESSAGE, (event) => {
        const payload = event as {
          text?: string;
          message?: string;
          result?: { text?: string };
        };
        const text = payload.text || payload.message || payload.result?.text;
        if (text) setLastTranscriberText(text);
      });

      await trtc.enterRoom({
        autoReceiveAudio: true,
        autoReceiveVideo: false,
        enableAutoPlayDialog: true,
        scene: TRTC.TYPE.SCENE_RTC,
        sdkAppId: Number(userSig.sdkAppId),
        strRoomId: roomCode,
        userId,
        userSig: userSig.userSig,
      });
      await trtc.startLocalAudio({ mute: muted });

      if (process.env.NEXT_PUBLIC_TRTC_REALTIME_TRANSCRIBER === "true") {
        const robotId = await trtc.startPlugin("RealtimeTranscriber", {
          sourceLanguage: "zh",
          userIdsToTranscribe: "all",
        });
        transcriberRobotIdRef.current =
          typeof robotId === "string" ? robotId : null;
      }

      setStatus("connected");
    } catch {
      await leave();
      setError("TRTC 语音连接失败，请检查控制台应用、UserSig 与浏览器麦克风权限。");
      setStatus("error");
    }
  }, [enabled, leave, muted, roomCode, userId]);

  useEffect(() => {
    return () => {
      void leave();
    };
  }, [leave]);

  return {
    status,
    error,
    lastTranscriberText,
    join,
    leave,
    isConnected: status === "connected",
    isJoining: status === "joining",
  };
}
