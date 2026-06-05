"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Headphones,
  LockKeyhole,
  Mic2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import type { JoinRoomResponse, RoomSnapshot } from "@/lib/room-contracts";
import {
  createLocalMemberId,
  saveStoredRoomMember,
} from "@/lib/room-client";

export function JoinScreen() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [deviceMessage, setDeviceMessage] = useState<string | null>(null);
  const roomCode = useMemo(
    () => decodeURIComponent(params.code || "ALONG-2026"),
    [params.code],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRoom() {
      const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { room?: RoomSnapshot };

      if (!cancelled && response.ok && data.room) {
        setRoom(data.room);
      }
    }

    void loadRoom().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsJoining(true);
    setJoinError(null);

    try {
      const memberName = name.trim() || "同行者";
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomCode)}/join`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: createLocalMemberId(),
            name: memberName,
          }),
        },
      );
      const data = (await response.json()) as JoinRoomResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "JOIN_FAILED");
      }

      saveStoredRoomMember(data.room.code, {
        id: data.member.id,
        name: data.member.name,
      });
      router.push(`/room/${encodeURIComponent(data.room.code)}`);
    } catch (error) {
      setJoinError(
        error instanceof Error && error.message === "ROOM_FULL"
          ? "房间人数已满，请让房主稍后再邀请。"
          : "加入房间失败，请确认链接是否正确。",
      );
    } finally {
      setIsJoining(false);
    }
  };

  const checkDevice = async () => {
    setDeviceMessage("正在检查麦克风权限...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setDeviceMessage("当前浏览器不支持麦克风检测，可以先加入房间。");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setDeviceMessage("麦克风可用，进入房间后即可加入语音。");
    } catch {
      setDeviceMessage("暂未获得麦克风权限，也可以先加入房间稍后再开启。");
    }
  };

  const onlineCount =
    room?.members.filter((member) => member.isOnline).length ?? 2;

  return (
    <main className="join-page">
      <div className="join-backdrop" />
      <header className="join-header">
        <BrandLogo />
        <span className="secure-label">
          <LockKeyhole size={14} />
          私密协作房间
        </span>
      </header>

      <section className="join-card">
        <div className="join-room-preview">
          <span className="join-kicker">林澈邀请你一起规划</span>
          <h1>{room?.title || "北京周末同行"}</h1>
          <p>进入后可以直接参与语音讨论，AI 会在一旁轻声整理共识与路线。</p>
          <div className="join-member-row">
            <div className="join-avatars">
              <span className="avatar avatar-violet">林</span>
              <span className="avatar avatar-coral">夏</span>
              <span className="avatar avatar-dashed">你</span>
            </div>
            <span>已有 {onlineCount} 位成员在房间内</span>
          </div>
        </div>

        <form className="join-form" onSubmit={join}>
          <div className="join-form-title">
            <span className="join-form-icon">
              <UsersRound size={20} />
            </span>
            <div>
              <strong>加入规划房间</strong>
              <span>房间码 {roomCode}</span>
            </div>
          </div>
          <label>
            你的称呼
            <input
              autoFocus
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：小明"
              value={name}
            />
          </label>
          <div className="device-check">
            <div>
              <span>
                <Mic2 size={17} />
              </span>
              <div>
                <strong>麦克风</strong>
                <small>加入后再请求权限</small>
              </div>
            </div>
            <button onClick={checkDevice} type="button">检查设备</button>
          </div>
          {deviceMessage && <p className="inline-form-note">{deviceMessage}</p>}
          <button className="join-submit" disabled={isJoining} type="submit">
            {isJoining ? "正在进入" : "进入房间"}
            <ArrowRight size={18} />
          </button>
          {joinError && <p className="inline-form-error">{joinError}</p>}
          <div className="join-privacy">
            <ShieldCheck size={15} />
            <span>语音仅用于实时规划分析，不向房间成员展示逐字转写。</span>
          </div>
        </form>
      </section>

      <div className="join-support">
        <Headphones size={15} />
        建议佩戴耳机，以获得更清晰的讨论体验
      </div>
    </main>
  );
}
