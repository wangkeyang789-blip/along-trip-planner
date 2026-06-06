"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  JoinRoomResponse,
  RoomMemberSnapshot,
  RoomSnapshot,
  RoomStatePatch,
} from "@/lib/room-contracts";
import {
  createLocalMemberId,
  normalizeRoomCode,
  readStoredRoomMember,
  saveStoredRoomMember,
  type StoredRoomMember,
} from "@/lib/room-client";

type RoomSessionState = {
  room: RoomSnapshot | null;
  member: RoomMemberSnapshot | null;
  members: RoomMemberSnapshot[];
  transcripts: RoomTranscript[];
  isLoading: boolean;
  error: string | null;
  muted: boolean;
  setMuted: (muted: boolean) => void;
  sendTranscript: (text: string) => Promise<void>;
  refresh: () => Promise<void>;
  updatePlanning: (patch: RoomStatePatch) => Promise<void>;
};

type RoomTranscript = {
  userId: string;
  userName: string;
  text: string;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const error = data as { error?: string };
    throw new Error(error.error || response.statusText || "REQUEST_FAILED");
  }

  return data;
}

export function useRoomSession(
  code: string,
  fallbackName = "林澈",
): RoomSessionState {
  const normalizedCode = normalizeRoomCode(code || "ALONG-2026");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [member, setMember] = useState<RoomMemberSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const transcriptRef = useRef("");
  const [transcripts, setTranscripts] = useState<RoomTranscript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const storedMemberRef = useRef<StoredRoomMember | null>(null);
  const mutedRef = useRef(false);

  const refresh = useCallback(async () => {
    const response = await fetch(
      `/api/rooms/${encodeURIComponent(normalizedCode)}`,
      { cache: "no-store" },
    );
    const data = await readJson<{ room: RoomSnapshot }>(response);
    setRoom(data.room);
    setTranscripts(
      data.room.members
        .filter((item) => item.transcript)
        .map((item) => ({
          userId: item.id,
          userName: item.name,
          text: item.transcript || "",
        })),
    );
    setError(null);

    const storedMember = storedMemberRef.current;
    if (storedMember) {
      const latestMember = data.room.members.find(
        (item) => item.id === storedMember.id,
      );
      if (latestMember) {
        setMember(latestMember);
        setMutedState(latestMember.isMuted);
        mutedRef.current = latestMember.isMuted;
      }
    }
  }, [normalizedCode]);

  useEffect(() => {
    let cancelled = false;

    async function join() {
      setIsLoading(true);
      setError(null);

      const stored = readStoredRoomMember(normalizedCode);
      const memberId = stored?.id || createLocalMemberId();
      const memberName = stored?.name || fallbackName;

      try {
        const response = await fetch(
          `/api/rooms/${encodeURIComponent(normalizedCode)}/join`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberId,
              name: memberName,
              isMuted: mutedRef.current,
            }),
          },
        );
        const data = await readJson<JoinRoomResponse>(response);
        if (cancelled) return;

        const storedMember = {
          id: data.member.id,
          name: data.member.name,
        };
        storedMemberRef.current = storedMember;
        saveStoredRoomMember(normalizedCode, storedMember);

        setRoom(data.room);
        setMember(data.member);
        setMutedState(data.member.isMuted);
        mutedRef.current = data.member.isMuted;
        setError(null);
      } catch (joinError) {
        if (!cancelled) {
          setError(
            joinError instanceof Error ? joinError.message : "JOIN_FAILED",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void join();

    return () => {
      cancelled = true;
    };
  }, [fallbackName, normalizedCode]);

  const heartbeat = useCallback(
    async (online = true) => {
      const storedMember = storedMemberRef.current;
      if (!storedMember) return;

      const response = await fetch(
        `/api/rooms/${encodeURIComponent(normalizedCode)}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: storedMember.id,
            isMuted: mutedRef.current,
            isOnline: online,
            isSpeaking: online && !mutedRef.current,
            transcript: transcriptRef.current || undefined,
          }),
        },
      );
      const data = await readJson<{ room: RoomSnapshot }>(response);
      setRoom(data.room);
      const latestMember = data.room.members.find(
        (item) => item.id === storedMember.id,
      );
      if (latestMember) {
        setMember(latestMember);
      }
    },
    [normalizedCode],
  );
  const memberId = member?.id;

  useEffect(() => {
    if (!memberId) return undefined;

    void heartbeat().catch(() => undefined);
    const heartbeatTimer = window.setInterval(() => {
      void heartbeat().catch((heartbeatError) => {
        setError(
          heartbeatError instanceof Error
            ? heartbeatError.message
            : "HEARTBEAT_FAILED",
        );
      });
    }, 7000);

    const pollTimer = window.setInterval(() => {
      void refresh().catch((refreshError) => {
        setError(
          refreshError instanceof Error ? refreshError.message : "SYNC_FAILED",
        );
      });
    }, 2500);

    const markOffline = () => {
      const storedMember = storedMemberRef.current;
      if (!storedMember) return;

      const body = JSON.stringify({
        memberId: storedMember.id,
        isMuted: mutedRef.current,
        isOnline: false,
        isSpeaking: false,
      });

      navigator.sendBeacon?.(
        `/api/rooms/${encodeURIComponent(normalizedCode)}/heartbeat`,
        new Blob([body], { type: "application/json" }),
      );
    };

    window.addEventListener("beforeunload", markOffline);

    return () => {
      window.clearInterval(heartbeatTimer);
      window.clearInterval(pollTimer);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [heartbeat, memberId, normalizedCode, refresh]);

  const setMuted = useCallback(
    (nextMuted: boolean) => {
      mutedRef.current = nextMuted;
      setMutedState(nextMuted);
      void heartbeat().catch((heartbeatError) => {
        setError(
          heartbeatError instanceof Error
            ? heartbeatError.message
            : "HEARTBEAT_FAILED",
        );
      });
    },
    [heartbeat],
  );

  const sendTranscript = useCallback(async (text: string) => {
    transcriptRef.current = text;
    const storedMember = storedMemberRef.current;
    if (!storedMember) return;
    await heartbeat(true);
  }, [heartbeat]);

  const updatePlanning = useCallback(
    async (patch: RoomStatePatch) => {
      const storedMember = storedMemberRef.current;
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(normalizedCode)}/state`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...patch,
            updatedBy: patch.updatedBy ?? storedMember?.id ?? null,
          }),
        },
      );
      const data = await readJson<{ room: RoomSnapshot }>(response);
      setRoom(data.room);
      setError(null);
    },
    [normalizedCode],
  );

  return {
    room,
    member,
    members: room?.members || [],
    transcripts,
    isLoading,
    error,
    muted,
    setMuted,
    sendTranscript,
    refresh,
    updatePlanning,
  };
}
