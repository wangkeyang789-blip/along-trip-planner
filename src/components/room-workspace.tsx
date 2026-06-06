"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  AudioLines,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleEllipsis,
  Clock3,
  CloudSun,
  Compass,
  Crown,
  DoorOpen,
  Ellipsis,
  Flag,
  Headphones,
  Landmark,
  ListFilter,
  MapPin,
  MessageCircleQuestion,
  Mic2,
  MicOff,
  Navigation2,
  Route,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  Utensils,
  UsersRound,
  X,
} from "lucide-react";
import { useRoomSession } from "@/hooks/use-room-session";
import { useWaypointResolver } from "@/hooks/use-amap-data";
import { useRouteVariantRouting } from "@/hooks/use-route-variant-routing";
import type { Waypoint } from "@/lib/types";
import { BrandLogo } from "@/components/brand-logo";
import { MapCanvas } from "@/components/map-canvas";
import { ShareDialog } from "@/components/share-dialog";
import { demoMembers } from "@/lib/demo-data";
import type {
  PlanningWaypointSnapshot,
  RoomMemberSnapshot,
  RoomSnapshot,
  RoomStatePatch,
  RouteVariantSnapshot,
} from "@/lib/room-contracts";
import { useTrtcVoice } from "@/hooks/use-trtc-voice";


import { useWebSpeech } from "@/hooks/use-web-speech";

const fallbackMembers: RoomMemberSnapshot[] = demoMembers.map(
  (member, index) => ({
    id: member.id,
    name: member.name,
    initials: member.initials,
    color: member.color,
    isHost: index === 0,
    isOnline: true,
    isMuted: Boolean(member.isMuted),
    isSpeaking: Boolean(member.isSpeaking),
    joinedAt: index,
    lastSeenAt: Date.now(),
  }),
);

function memberStatus(member: RoomMemberSnapshot) {
  if (!member.isOnline) return "离线";
  if (member.isHost && member.isSpeaking) return "房主 · 正在发言";
  if (member.isHost) return "房主 · 在线";
  if (member.isMuted) return "麦克风已关闭";
  if (member.isSpeaking) return "正在发言";
  return "在线";
}

function coordinatorFor(members: RoomMemberSnapshot[]) {
  return (
    members.find((item) => item.isOnline && item.isHost) ||
    members.find((item) => item.isOnline) ||
    null
  );
}

function recentConversationSize(room: RoomSnapshot) {
  return room.conversation.recentTurns.reduce((total, turn) => total + turn.text.length, 0);
}

function normalizeWaypoints(
  waypoints: PlanningWaypointSnapshot[] | undefined,
) {
  return (waypoints || []).map((waypoint, index) => ({
    ...waypoint,
    id: waypoint.id || `poi-${index}`,
    order: waypoint.order ?? index,
    resolveStatus: "pending" as const,
  }));
}

export function RoomWorkspace() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = decodeURIComponent(params.code || "ALONG-2026");
  const {
    room,
    member,
    members,
    isLoading,
    error,
    muted,
    setMuted,
    sendTranscript,
    sendMessage,
    updatePlanning,
  } = useRoomSession(code);
  const [shareOpen, setShareOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [agentThinking, setAgentThinking] = useState(false);
  const [instantFeedback, setInstantFeedback] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedWpId, setSelectedWpId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const planning = room?.planning;
  const conversation = room?.conversation;
  const selectedVariant = planning?.routeVariants?.[0] || null;
  const waypointsFromApi: Array<{ id: string; name: string; order: number }> = planning?.waypoints?.map((wp) => ({
    id: wp.id,
    name: wp.name,
    order: wp.order,
  })) || [];
  const displayMembers = members.length ? members : fallbackMembers;
  const onlineMembers = displayMembers.filter((item) => item.isOnline);
  const visibleAvatars = displayMembers.slice(0, 3);
  const extraMemberCount = Math.max(displayMembers.length - visibleAvatars.length, 0);
  const activeSpeaker =
    displayMembers.find((item) => item.isOnline && item.isSpeaking) ||
    member ||
    displayMembers[0];
  const roomTitle = room?.title || "同路 · 协作旅行";
  const trtcReady = Boolean(room?.trtc.ready);
  const currentCity = planning?.city || "北京";
  const syncLabel = error ? "同步稍后重试" : isLoading ? "连接房间中" : "安静同步";

  const selectedWaypointsForApi =
    selectedVariant?.waypoints.map((wp) => ({
      id: wp.id,
      name: wp.name,
      order: wp.order,
    })) || waypointsFromApi;
  const coordinator = coordinatorFor(onlineMembers);
  const isCoordinator = Boolean(member?.id && coordinator?.id === member.id);
  const waypointResolver = useWaypointResolver(selectedWaypointsForApi, planning?.city || "北京", selectedVariant?.id);
  const resolvedWaypoints = waypointResolver.waypoints;
  const speech = useWebSpeech();
  const routedVariantState = useRouteVariantRouting(
    selectedVariant,
    resolvedWaypoints,
    planning?.city || "北京",
  );
  const routedVariant = routedVariantState.variant || selectedVariant;
  const routePolylines =
    routedVariant?.segments
      .map((segment) => segment.polyline)
      .filter((polyline): polyline is [number, number][] => Boolean(polyline)) || [];

  const trtcVoice = useTrtcVoice({
    enabled: trtcReady,
    muted,
    roomCode: room?.code || code,
    userId: member?.id,
  });

  const patchPlanning = async (patch: RoomStatePatch) => {
    try {
      await updatePlanning(patch);
    } catch {
      // silently fail
    }
  };

  const sentTranscriptRef = useRef("");
  const lastRouteVersionRef = useRef(0);
  const compressionInFlightRef = useRef(false);
  const lastRoutedPatchRef = useRef("");
  const roomRef = useRef(room);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);


  // Instant feedback when new transcript arrives
  useEffect(() => {
    const currentRoom = roomRef.current;
    if (!currentRoom) return;
    const turns = currentRoom.conversation.recentTurns;
    if (turns.length === 0) return;
    const lastTurn = turns[turns.length - 1];
    if (!lastTurn) return;
    setInstantFeedback("…");
    const timer = window.setTimeout(() => setInstantFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [conversation?.version]);

  useEffect(() => {
    const text = speech.transcript.trim();
    if (!text) return;

    const previousText = sentTranscriptRef.current;
    const delta = text.startsWith(previousText)
      ? text.slice(previousText.length).trim()
      : text;
    if (!delta) return;

    sentTranscriptRef.current = text;
    void sendTranscript(delta).catch(() => undefined);
  }, [sendTranscript, speech.transcript]);

  useEffect(() => {
    if (!planning?.routeVariants || !routedVariant || routedVariant.routeStatus === "pending") return;
    const key = `${routedVariant.id}:${routedVariant.routeStatus}:${routedVariant.totalDistanceText}:${routedVariant.totalDurationText}`;
    if (lastRoutedPatchRef.current === key) return;
    lastRoutedPatchRef.current = key;

    const routeVariants = planning.routeVariants.map((variant) =>
      variant.id === routedVariant.id ? routedVariant : variant,
    );
    void patchPlanning({ routeVariants });
  }, [planning?.routeVariants, routedVariant]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 2200);
  };

  const requestConversationCompression = async () => {
    const currentRoom = roomRef.current;
    const currentConversation = currentRoom?.conversation;
    if (!currentRoom || !currentConversation || compressionInFlightRef.current) return;
    if (recentConversationSize(currentRoom) < 3000) return;
    if (currentConversation.compressedUntilVersion >= currentConversation.version) return;

    compressionInFlightRef.current = true;
    try {
      const currentPlanning = currentRoom.planning;
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "compress",
          city: currentPlanning.city || "",
          rollingSummary: currentConversation.rollingSummary,
          recentTurns: currentConversation.recentTurns,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && typeof data.rollingSummary === "string") {
        await patchPlanning({
          conversation: {
            rollingSummary: data.rollingSummary,
            recentTurns: currentConversation.recentTurns.slice(-24),
            compressedUntilVersion: currentConversation.version,
          },
        });
      }
    } finally {
      compressionInFlightRef.current = false;
    }
  };

  const requestAgentPlan = async (scope: "route") => {
    const currentRoom = roomRef.current;
    const currentConversation = currentRoom?.conversation;
    if (!currentConversation) return;
    setAgentThinking(true);

    try {
      const currentPlanning = currentRoom?.planning;
      const city = currentPlanning?.city || "";
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          recentTurns: currentConversation.recentTurns,
          rollingSummary: currentConversation.rollingSummary,
          city,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.plan) {
        const plan = data.plan;
        const patch: RoomStatePatch = {
          routeUpdatedAt: Date.now(),
        };

        if (plan.city && typeof plan.city === "string") {
          patch.city = plan.city;
        }

        if (plan.summary) patch.summary = plan.summary;
        if (plan.routeDescription) patch.routeDescription = plan.routeDescription;
        if (Array.isArray(plan.routeVariants) && plan.routeVariants.length > 0) {
          const routeVariants = plan.routeVariants.map(
            (variant: RouteVariantSnapshot, index: number) => ({
              ...variant,
              id: variant.id || `variant-${index}`,
              waypoints: normalizeWaypoints(variant.waypoints),
            }),
          );
          patch.routeVariants = routeVariants;
          patch.selectedVariantId = routeVariants[0]?.id || null;
          patch.waypoints = normalizeWaypoints(routeVariants[0]?.waypoints);
        } else if (Array.isArray(plan.waypoints) && plan.waypoints.length > 0) {
          patch.waypoints = normalizeWaypoints(plan.waypoints);
        }

        if (Object.keys(patch).length > 0) {
          await patchPlanning(patch);
        }
      } else {
        showNotice(data.configured === false ? "AI API 未配置" : "AI API 暂时不可用");
      }
    } catch (planError) {
      console.warn("[AgentPlan] fetch failed:", planError);
      showNotice("AI 规划服务异常，稍后重试");
    } finally {
      setAgentThinking(false);
    }
  };

  // AI trigger timer: check every 10s, compress then directly request route
  useEffect(() => {
    if (!isCoordinator) return undefined;

    const timer = window.setInterval(() => {
      const currentConversation = roomRef.current?.conversation;
      if (!currentConversation) return;
      if (currentConversation.version <= lastRouteVersionRef.current) return;
      lastRouteVersionRef.current = currentConversation.version;
      void requestConversationCompression().finally(() => {
        void requestAgentPlan("route");
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [isCoordinator]);


  // Direction selection removed - AI handles all planning

  const handleSelectWaypoint = (wpId: string) => {
    showNotice("已选地点");
  };

  const handleSendMessage = async () => {
    const text = messageText.trim();
    if (!text || sendingMessage) return;
    setSendingMessage(true);
    try {
      await sendMessage(text);
      setMessageText("");
      showNotice("消息已发送");
    } catch {
      showNotice("发送失败，请重试");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleMicClick = () => {
    if (speech.isListening) {
      speech.stop();
      showNotice("语音识别已关闭，已收集到后台摘要队列");
      return;
    }

    if (!speech.isReady) {
      showNotice("语音识别正在初始化，请稍后再试");
    } else if (speech.isSupported) {
      speech.start();
      showNotice("语音识别已启动，请开始说话");
      setMuted(false);
    } else {
      showNotice("当前浏览器不支持语音识别");
    }
  };

  // Amap search redirect removed - no static selected place

  const leaveRoom = () => {
    void trtcVoice.leave();
    router.push("/");
  };

  const voiceLabel = speech.isListening
    ? (speech.interimText || "语音识别中")
    : !speech.isReady
      ? "语音初始化中"
      : speech.isSupported
        ? "语音识别"
        : trtcVoice.isJoining
          ? "连接语音中"
          : trtcVoice.isConnected
            ? "语音已连接"
            : trtcReady
              ? "加入语音"
              : "语音待配置";

  return (
    <main className="workspace-page">
      <header className="workspace-header">
        <div className="workspace-brand-area">
          <BrandLogo />
          <span className="header-divider" />
          <button
            className="trip-title-button"
            onClick={() => showNotice(`当前房间：${roomTitle}`)}
            type="button"
          >
            <span>
              <strong>{roomTitle}</strong>
              <small>{trtcReady ? "语音配置就绪" : "轻量协作中"}</small>
            </span>
            <ChevronDown size={16} />
          </button>
        </div>

        <div className="workspace-header-center">
          <span className="live-collaboration">
            <i />
            {syncLabel}
          </span>
          <div className="header-avatars">
            {visibleAvatars.map((item) => (
              <span
                className={`header-avatar ${
                  item.isSpeaking ? "is-speaking" : ""
                }`}
                key={item.id}
                style={{ "--avatar-color": item.color } as CSSProperties}
                title={item.name}
              >
                {item.initials}
              </span>
            ))}
            {extraMemberCount > 0 && (
              <span className="header-avatar-count">+{extraMemberCount}</span>
            )}
          </div>
          <button
            className="share-room-button"
            onClick={() => setShareOpen(true)}
            type="button"
          >
            <Share2 size={16} />
            分享房间
          </button>
        </div>

        <div className="workspace-header-actions">
          
          <button
            className="profile-button"
            onClick={() =>
              showNotice(
                member?.isHost ? "你当前是房主。" : "你当前是房间成员。",
              )
            }
            type="button"
          >
            <span>{member?.initials || activeSpeaker.initials}</span>
            <div>
              <strong>{member?.name || activeSpeaker.name}</strong>
              <small>{member?.isHost ? "房主" : "成员"}</small>
            </div>
            <ChevronDown size={14} />
          </button>
        </div>
      </header>

      <div className="workspace-body">
        <aside className="summary-sidebar">
          <div className="sidebar-heading">
            <div className="sidebar-tabs">
              <span className="sidebar-tab-label">协作摘要</span>
            </div>
            
          </div>

          <div className="sidebar-scroll">
            <section className="sidebar-section chat-section">
              <div className="section-title">
                <div>
                  <MessageCircleQuestion size={16} />
                  <strong>讨论消息</strong>
                </div>
                <span className="chat-count">
                  {conversation?.recentTurns.length ?? 0} 条
                </span>
              </div>
              <div className="chat-messages">
                {conversation?.recentTurns.length === 0 ? (
                  <div className="chat-empty">
                    <span>还没有消息，在下方输入框开始讨论吧</span>
                  </div>
                ) : (
                  conversation?.recentTurns.slice(-20).map((turn) => (
                    <div key={turn.id} className="chat-message">
                      <span
                        className="chat-avatar"
                        style={{ "--avatar-color": displayMembers.find(m => m.id === turn.userId)?.color || "#75a7e8" } as CSSProperties}
                      >
                        {turn.userName.slice(0, 1)}
                      </span>
                      <div className="chat-bubble">
                        <small>{turn.userName}</small>
                        <p>{turn.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {(error || !trtcReady || trtcVoice.error) && (
              <div className={`room-service-alert ${error ? "" : "is-muted"}`}>
                <ShieldCheck size={14} />
                <span>
                  {trtcVoice.error
                    ? trtcVoice.error
                    : error
                    ? "房间同步暂时不稳定，页面会继续自动重试。"
                    : "TRTC 语音尚未配置，当前先运行房间协作与高德地图 Demo。"}
                </span>
              </div>
            )}

            <section className="sidebar-section member-section">
              <div className="section-title">
                <div>
                  <UsersRound size={16} />
                  <strong>房间成员</strong>
                </div>
                <button onClick={() => setShareOpen(true)} type="button">
                  邀请
                </button>
              </div>
              <div className="member-list">
                {displayMembers.map((item) => (
                  <div
                    className={`member-row ${
                      item.isOnline ? "" : "is-offline"
                    }`}
                    key={item.id}
                  >
                    <span
                      className={`member-avatar ${
                        item.isSpeaking ? "is-speaking" : ""
                      }`}
                      style={
                        { "--avatar-color": item.color } as CSSProperties
                      }
                    >
                      {item.initials}
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{memberStatus(item)}</small>
                    </span>
                    {item.isHost ? (
                      <Crown size={14} />
                    ) : item.isMuted ? (
                      <MicOff size={14} />
                    ) : (
                      <AudioLines size={14} />
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>

        <div className="map-workspace">
          <div className="map-toolbar">
            <button
              aria-label={`当前目的地：${currentCity}`}
              className="location-context"
              onClick={() => showNotice(`当前目的地：${currentCity}`)}
              type="button"
            >
              <span>
                <MapPin size={16} />
              </span>
              <div>
                <small>当前目的地</small>
                <strong>{currentCity}</strong>
              </div>
              <ChevronDown size={15} />
            </button>
            <label className="map-search">
              <Search size={16} />
              <input
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    showNotice("地点搜索会优先走高德 POI，当前可先通过右侧路线点选。");
                  }
                }}
                placeholder="搜索地点，或继续通过语音讨论"
              />
            </label>
            <div className="weather-pill">
              <CloudSun size={17} />
              <span>{waypointResolver.weatherText || "获取天气中…"}</span>
            </div>
          </div>
          <MapCanvas
            waypoints={waypointResolver.waypoints}
            routePolylines={routePolylines}
            selectedWaypointId={selectedWpId}
            onSelectWaypoint={(wpId) => { setSelectedWpId(wpId); showNotice("已选择地点"); }}
            onNotify={showNotice}
          />
        </div>
        <aside className="route-sidebar">
            <div className="map-route-panel-header">
              <Route size={16} />
              <strong>行程单</strong>
              {planning?.routeVariants && planning.routeVariants.length > 0 ? (
                <span>{planning.routeVariants[0]?.name || "方案"}</span>
              ) : (
                <button
                  className="map-route-trigger-btn"
                  onClick={() => { void requestAgentPlan("route"); }}
                  type="button"
                  disabled={agentThinking}
                >
                  <Sparkles size={12} />
                  {agentThinking ? "生成中…" : "生成路线"}
                </button>
              )}
            </div>
            {planning?.routeVariants && planning.routeVariants.length > 0 ? (
              <>
                {routedVariant && (
                  <div className="map-route-details">
                    <div className="map-route-metrics">
                      <span><Clock3 size={13} /> {routedVariant.totalDurationText || "--"}</span>
                      <span><Route size={13} /> {routedVariant.totalDistanceText || "--"}</span>
                      <span><Flag size={13} /> {routedVariant.totalCostText || "--"}</span>
                    </div>
                    <div className="map-route-actions">
                      <button
                        className="map-route-action-btn"
                        onClick={() => {
                          const text = (routedVariant.waypoints || []).sort((a, b) => a.order - b.order)
                            .map((wp, i) => `${i + 1}. ${wp.name}`).join(" → ");
                          navigator.clipboard.writeText(text).then(() => showNotice("已复制行程"));
                        }}
                        type="button"
                        title="复制行程文本"
                      >
                        📋 复制行程
                      </button>
                      <button
                        className="map-route-action-btn"
                        onClick={() => {
                          setShareOpen(true);
                        }}
                        type="button"
                        title="分享方案"
                      >
                        📤 分享
                      </button>
                    </div>
                    <div className="map-route-segments">
                      {(routedVariant.waypoints || []).sort((a, b) => a.order - b.order).map((wp, idx) => {
                        const resolved = waypointResolver.waypoints.find((rw) => rw.id === wp.id);
                        const seg = routedVariant.segments[idx - 1];
                        return (
                          <div key={wp.id} className="map-segment-item" onClick={() => setSelectedWpId(wp.id)}>
                            <div className="map-segment-dot">
                              <b>{idx + 1}</b>
                              {idx < (routedVariant.waypoints || []).length - 1 && <i />}
                            </div>
                            <div className="map-segment-info">
                              <strong>{wp.name}</strong>
                              <small>{resolved?.resolveStatus === "ready" ? resolved.address : "搜索中…"}</small>
                              {seg && (
                                <span className="map-segment-route">
                                  {seg.modeLabel} {seg.durationText && "· " + seg.durationText} {seg.distanceText && "· " + seg.distanceText}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="map-route-empty">
                <Compass size={32} />
                <p>开始讨论旅行计划</p>
                <small>AI 会根据讨论内容自动规划路线</small>
              </div>
            )}
        </aside>
      </div>

      <footer className="call-dock">
        <div className="call-dock-left">
          <span className="call-duration">
            <i />
            协作同步中 · {onlineMembers.length}/{room?.participantLimit ?? 5} 人在线
          </span>
          <span className="call-separator" />
          <span className="call-room-code">房间码 {room?.code || code}</span>
        </div>
        <div className="message-input-area">
          <input
            className="message-input"
            disabled={sendingMessage}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder="输入消息参与讨论..."
            type="text"
            value={messageText}
          />
          <button
            className="message-send-btn"
            disabled={!messageText.trim() || sendingMessage}
            onClick={() => void handleSendMessage()}
            type="button"
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="call-controls">
          <button className="call-control leave" onClick={leaveRoom} type="button">
            <DoorOpen size={20} />
            <span>离开</span>
          </button>
        </div>
      </footer>

      <ShareDialog
        code={room?.code || code}
        onClose={() => setShareOpen(false)}
        open={shareOpen}
      />

      
      {notice && (
        <div className="workspace-toast" role="status">
          <Sparkles size={14} />
          {notice}
        </div>
      )}
    </main>
  );
}
