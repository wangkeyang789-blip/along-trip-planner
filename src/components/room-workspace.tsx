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
import { AiConfirmCard } from "@/components/ai-confirm-card";
import { demoMembers } from "@/lib/demo-data";
import type {
  PlanningWaypointSnapshot,
  RoomMemberSnapshot,
  RoomSnapshot,
  RoomStatePatch,
  RouteVariantSnapshot,
} from "@/lib/room-contracts";
import { useTrtcVoice } from "@/hooks/use-trtc-voice";

type AgentPlanApiResponse = {
  configured?: boolean;
  source?: string;
  model?: string;
  error?: string;
  raw?: string;
  attempts?: Array<{ model: string; ok: boolean; error?: string }>;
  plan?: {
    summary?: string;
    routeDescription?: string;
    city?: string;
    waypoints?: PlanningWaypointSnapshot[];
    routeVariants?: RouteVariantSnapshot[];
  };
};

function formatAgentApiMessage(
  response: Response,
  data: AgentPlanApiResponse,
) {
  if (data.configured === false) {
    return "AI 规划 API 还没配置，请检查 DASHSCOPE_API_KEY";
  }

  if (!response.ok) {
    return data.error || "AI 规划 API 调用失败，稍后可重试";
  }

  return (
    (data.plan?.summary && data.model
      ? `${data.plan.summary}（${data.model}）`
      : data.plan?.summary) ||
    data.raw ||
    "AI 规划 API 已返回"
  );
}
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
    updatePlanning,
  } = useRoomSession(code);
  const [shareOpen, setShareOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [agentNote, setAgentNote] = useState<string | null>(null);
  const [agentThinking, setAgentThinking] = useState(false);
  const [greetingShown, setGreetingShown] = useState(false);
  const [instantFeedback, setInstantFeedback] = useState<string | null>(null);
  const [confirmedSummary, setConfirmedSummary] = useState<string | null>(null);
  const [confirmCountdown, setConfirmCountdown] = useState<number | null>(null);
  const confirmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [summaryTab, setSummaryTab] = useState<"summary" | "route">("summary");
  const [selectedWpId, setSelectedWpId] = useState<string | null>(null);

  const planning = room?.planning;
  const conversation = room?.conversation;
  const selectedVariant =
    planning?.routeVariants.find(
      (variant) => variant.id === planning.selectedVariantId,
    ) ||
    planning?.routeVariants[0] ||
    null;
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
  const lastSummaryVersionRef = useRef(0);
  const lastRouteVersionRef = useRef(0);
  const compressionInFlightRef = useRef(false);
  const lastRoutedPatchRef = useRef("");
  const roomRef = useRef(room);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Cold start: AI greeting if no conversation after 5 seconds
  useEffect(() => {
    if (greetingShown) return;
    const timer = window.setTimeout(() => {
      const currentRoom = roomRef.current;
      if (!currentRoom) return;
      const hasConversation = currentRoom.conversation.recentTurns.length > 0;
      if (!hasConversation && !greetingShown) {
        setGreetingShown(true);
        setAgentNote("嗨，想去哪儿？国内还是国外？大概几天？有特别想去的地方吗？");
        // Auto-clear after 8 seconds
        setTimeout(() => setAgentNote(null), 8000);
      }
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [isLoading, greetingShown]);

  // Instant feedback when new transcript arrives
  useEffect(() => {
    const currentRoom = roomRef.current;
    if (!currentRoom) return;
    const turns = currentRoom.conversation.recentTurns;
    if (turns.length === 0) return;
    const lastTurn = turns[turns.length - 1];
    if (!lastTurn) return;
    setInstantFeedback("已收到新对话，正在分析…");
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

  const requestAgentPlan = async (scope: "summary" | "route") => {
    const currentRoom = roomRef.current;
    const currentConversation = currentRoom?.conversation;
    if (!currentConversation) return;
    setAgentThinking(true);
    setAgentNote(null);

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

      // Update visual status
      const message = formatAgentApiMessage(response, data);
      setAgentNote(message);

      if (response.ok && data.plan) {
        const plan = data.plan;
        const patch: RoomStatePatch = {
          ...(scope === "summary"
            ? { summaryUpdatedAt: Date.now() }
            : { routeUpdatedAt: Date.now() }),
        };

        if (plan.city && typeof plan.city === "string") {
          patch.city = plan.city;
        }

        if (plan.summary) patch.summary = plan.summary;
        if (scope === "route") {
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
        }

        if (Object.keys(patch).length > 0) {
          await patchPlanning(patch);
          if (scope === "route") {
            showNotice("AI 已生成路线方案，正在加载地图…");
          } else {
            showNotice("AI 已更新协作摘要");
          }
        }
      } else {
        showNotice(data.configured === false ? "AI API 未配置" : "AI API 暂时不可用");
        if (data.error) setAgentNote("AI 规划失败：" + data.error);
      }
    } catch (planError) {
      console.warn("[AgentPlan] fetch failed:", planError);
      showNotice("AI 规划服务异常，稍后重试");
      setAgentNote(
        planError instanceof Error ? "AI 规划失败：" + planError.message : "AI 规划失败"
      );
    } finally {
      setAgentThinking(false);
    }
  };

  // Summary timer: check every 10s, generate summary, then start confirm countdown
  useEffect(() => {
    if (!isCoordinator) return undefined;

    const timer = window.setInterval(() => {
      const currentConversation = roomRef.current?.conversation;
      if (!currentConversation) return;
      if (currentConversation.version <= lastSummaryVersionRef.current) return;
      lastSummaryVersionRef.current = currentConversation.version;
      void requestConversationCompression().finally(() => {
        void requestAgentPlan("summary");
      });
    }, 10000);

    return () => window.clearInterval(timer);
  }, [isCoordinator]);

  // When summary arrives, start 10s auto-confirm countdown
  useEffect(() => {
    if (!planning?.summary || confirmedSummary === planning.summary) return;
    // New summary arrived, start countdown
    setConfirmCountdown(10);
    setConfirmedSummary(null);

    // Clear existing timer
    if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);

    confirmTimerRef.current = setInterval(() => {
      setConfirmCountdown(prev => {
        if (prev === null || prev <= 1) {
          // Auto-confirm and trigger route
          if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
          confirmTimerRef.current = null;
          setConfirmedSummary(planning?.summary || null);
          void requestAgentPlan("route");
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
    };
  }, [planning?.summary]);

  // Fallback route timer: only triggers if no confirm happened for 60s
  useEffect(() => {
    if (!isCoordinator) return undefined;

    const timer = window.setInterval(() => {
      const currentConversation = roomRef.current?.conversation;
      if (!currentConversation) return;
      if (currentConversation.version <= lastRouteVersionRef.current) return;
      if (confirmedSummary || confirmCountdown !== null) return; // skip if confirm flow is active
      lastRouteVersionRef.current = currentConversation.version;
      void requestAgentPlan("route");
    }, 60000);

    return () => window.clearInterval(timer);
  }, [isCoordinator, confirmedSummary, confirmCountdown]);


  // Direction selection removed - AI handles all planning

  const handleSelectWaypoint = (wpId: string) => {
    showNotice("已选地点");
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
            {summaryTab === "summary" ? (
              <>
                <section className={"listening-card" + (agentThinking ? " is-thinking" : "")}>
                  <div className="listening-ambient" />
                  <div className="listening-header">
                    <span className="ai-orb">
                      <Sparkles size={17} />
                    </span>
                    <div>
                      <strong>{agentThinking ? "AI 正在整理" : "语音转写"}</strong>
                      <span>{instantFeedback || ""}</span>
                    </div>
                    <span className="listening-live">
                      <i />
                      {speech.isListening ? "语音识别中" : ""}
                    </span>
                  </div>
                  <div className="sound-wave" aria-hidden="true">
                    {Array.from({ length: 28 }).map((_, index) => (
                      <i key={index} />
                    ))}
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

                <section className="sidebar-section">
                  <div className="section-title">
                    <div>
                      <CheckCircle2 size={16} />
                      <strong>协作摘要</strong>
                    </div>
                  </div>
                  {planning?.summary ? (
                    <AiConfirmCard
                      summary={`${confirmCountdown !== null ? `[${confirmCountdown}s后自动确认] ` : ""}我理解为：${planning.summary}`}
                      themes={[]}
                      city={planning.city || ""}
                      isConfirmed={!!confirmedSummary}
                      onConfirm={(correctedText) => {
                        // Clear countdown
                        if (confirmTimerRef.current) clearInterval(confirmTimerRef.current);
                        setConfirmCountdown(null);
                        const text = correctedText || planning.summary || "";
                        setConfirmedSummary(text);
                        void sendTranscript("[用户确认] " + text);
                        showNotice("已确认，正在生成路线…");
                        // Immediately trigger route generation
                        void requestAgentPlan("route");
                      }}
                      onModify={() => {
                        showNotice("请输入修改内容");
                      }}
                    />
                  ) : (
                    <div className="consensus-card">
                      <div className="consensus-primary">
                        <span className="consensus-icon">
                          <Compass size={18} />
                        </span>
                        <div>
                          <strong>AI 正在倾听讨论…</strong>
                          <span>开始讨论你的旅行计划吧</span>
                        </div>
                      </div>
                    </div>
                  )}
                </section>

                

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
              </>
            ) : (
              <section className="route-panel">
                <div className="route-panel-intro">
                  <span className="route-panel-icon">
                    <Route size={20} />
                  </span>
                  <div>
                    <strong>AI 规划的路线</strong>
                    <span>{planning?.routeDescription || "AI 正在倾听讨论…"}</span>
                  </div>
                </div>
                {planning?.routeVariants && planning.routeVariants.length > 0 ? (
                  <>
                    <div className="route-variant-list">
                      {planning.routeVariants.map((variant) => (
                        <button
                          className={variant.id === selectedVariant?.id ? "is-active" : ""}
                          key={variant.id}
                          onClick={() => {
                            void patchPlanning({
                              selectedVariantId: variant.id,
                              waypoints: normalizeWaypoints(variant.waypoints),
                            });
                            setSelectedWpId(null);
                          }}
                          type="button"
                        >
                          <span
                            className="route-color"
                            style={{ background: variant.id === selectedVariant?.id ? "#7167f6" : "#d7d9e8" }}
                          />
                          <span>
                            <strong>{variant.name}</strong>
                            <small>{variant.description}</small>
                          </span>
                          {variant.id === selectedVariant?.id ? (
                            <Check size={15} />
                          ) : (
                            <ChevronRight size={15} />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="consensus-meta" style={{ marginTop: 12 }}>
                      <span>
                        <Clock3 size={14} />
                        {routedVariant?.totalDurationText || "时间待计算"}
                      </span>
                      <span>
                        <Route size={14} />
                        {routedVariant?.totalDistanceText || "距离待计算"}
                      </span>
                      <span>
                        <Flag size={14} />
                        {routedVariant?.totalCostText || "费用待计算"}
                      </span>
                    </div>
                    <div className="route-steps">
                      {(routedVariant?.waypoints || [])
                        .sort((a, b) => a.order - b.order)
                        .map((wp, idx) => {
                          const resolved = waypointResolver.waypoints.find((rw) => rw.id === wp.id);
                          const segment = routedVariant?.segments[idx - 1];
                          return (
                            <div
                              key={wp.id}
                              className={"final-timeline-item" + (resolved?.resolveStatus === "ready" ? " is-resolved" : "")}
                              onClick={() => {
                                setSelectedWpId(wp.id);
                                showNotice("已查看 " + wp.name);
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <b style={{ background: "#7167f6" }}>{idx + 1}</b>
                              <div>
                                <strong>{wp.name}</strong>
                                <small>
                                  {idx > 0
                                    ? `${segment?.modeLabel || "交通"} · ${segment?.durationText || "时间待计算"} · ${segment?.distanceText || "距离待计算"}`
                                    : resolved?.address || wp.description || "路线起点"}
                                </small>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                ) : (
                  <div className="route-steps-empty" style={{ padding: 20, textAlign: "center", color: "#888" }}>
                    <p>{agentThinking ? "AI 正在思考路线…" : "开始讨论吧，AI 会生成路线"}</p>
                  </div>
                )}
              </section>
            )}
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
              <strong>路线</strong>
              {planning?.routeVariants && planning.routeVariants.length > 0 ? (
                <span>{planning.routeVariants.length} 个方案</span>
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
                <div className="map-route-variants">
                  {planning.routeVariants.map((variant) => (
                    <button
                      className={`map-route-variant-btn ${variant.id === selectedVariant?.id ? "is-active" : ""}`}
                      key={variant.id}
                      onClick={() => {
                        void patchPlanning({
                          selectedVariantId: variant.id,
                          waypoints: normalizeWaypoints(variant.waypoints),
                        });
                        setSelectedWpId(null);
                      }}
                      type="button"
                    >
                      <span className="variant-dot" style={{ background: variant.id === selectedVariant?.id ? "#7167f6" : "#d7d9e8" }} />
                      <span className="variant-info">
                        <strong>{variant.name}</strong>
                        <small>{variant.description}</small>
                      </span>
                      {variant.id === selectedVariant?.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
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
                <small>点击上方"生成路线"，AI 会根据讨论内容规划 3 条可选路线</small>
              </div>
            )}
        </aside>
      </div>

      <footer className="call-dock">
        <div className="call-dock-left">
          <span className="call-duration">
            <i />
            协作同步中 · {onlineMembers.length} 人在线
          </span>
          <span className="call-separator" />
          <span className="call-room-code">房间码 {room?.code || code}</span>
        </div>
        <div className="call-controls">
          <button
            aria-label={muted ? "打开麦克风" : "关闭麦克风"}
            className={`call-control ${muted ? "is-danger" : "is-primary"}`}
            onClick={handleMicClick}
            type="button"
          >
            {muted ? <MicOff size={20} /> : <Mic2 size={20} />}
            <span>
              {speech.isListening
                ? speech.interimText || "语音识别中"
                : trtcVoice.isConnected
                  ? muted
                    ? "打开麦克风"
                    : "麦克风已开"
                  : voiceLabel}
            </span>
          </button>
          <button
            className="call-control"
            onClick={() => {
              if (trtcVoice.isConnected) {
                void trtcVoice.leave();
                showNotice("已断开语音。");
                return;
              }
              if (trtcReady) {
                void trtcVoice.join();
                return;
              }
              showNotice("配置 TRTC 后即可加入真实语音。");
            }}
            type="button"
          >
            <Headphones size={20} />
            <span suppressHydrationWarning>{trtcVoice.isConnected ? "断开语音" : voiceLabel}</span>
          </button>
          
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
