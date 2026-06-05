"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  AudioLines,
  Bell,
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
  PanelLeftClose,
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
import { BrandLogo } from "@/components/brand-logo";
import { MapCanvas } from "@/components/map-canvas";
import { ShareDialog } from "@/components/share-dialog";
import {
  demoChoices,
  demoMembers,
  demoPlaces,
  demoPreferences,
  demoRoutes,
} from "@/lib/demo-data";
import { useAmapData } from "@/hooks/use-amap-data";
import type { RoomMemberSnapshot, RoomStatePatch } from "@/lib/room-contracts";
import { useTrtcVoice } from "@/hooks/use-trtc-voice";

const choiceIcons = {
  landmark: Landmark,
  route: Route,
  utensils: Utensils,
};

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

function routeIdForChoice(choiceId: string) {
  if (choiceId === "compact") return "compact";
  if (choiceId === "landmark") return "classic";
  return "balanced";
}

function memberStatus(member: RoomMemberSnapshot) {
  if (!member.isOnline) return "离线";
  if (member.isHost && member.isSpeaking) return "房主 · 正在发言";
  if (member.isHost) return "房主 · 在线";
  if (member.isMuted) return "麦克风已关闭";
  if (member.isSpeaking) return "正在发言";
  return "在线";
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
    updatePlanning,
  } = useRoomSession(code);
  const [shareOpen, setShareOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [agentNote, setAgentNote] = useState<string | null>(null);
  const [agentThinking, setAgentThinking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [summaryTab, setSummaryTab] = useState<"summary" | "route">("summary");

  const planning = room?.planning;
  const activeRouteId = planning?.activeRouteId || "balanced";
  const selectedPlaceId = planning?.selectedPlaceId || "forbidden-city";
  const selectedChoiceId = planning?.selectedChoiceId || null;
  const displayMembers = members.length ? members : fallbackMembers;
  const onlineMembers = displayMembers.filter((item) => item.isOnline);
  const visibleAvatars = displayMembers.slice(0, 3);
  const extraMemberCount = Math.max(displayMembers.length - visibleAvatars.length, 0);
  const activeSpeaker =
    displayMembers.find((item) => item.isOnline && item.isSpeaking) ||
    member ||
    displayMembers[0];
  const roomTitle = room?.title || "北京周末同行";
  const trtcReady = Boolean(room?.trtc.ready);
  const syncLabel = error ? "同步稍后重试" : isLoading ? "连接房间中" : "安静同步";

  const activeRoute = useMemo(
    () => demoRoutes.find((route) => route.id === activeRouteId) || demoRoutes[0],
    [activeRouteId],
  );
  const amapData = useAmapData(activeRoute);
  const selectedPlace = useMemo(
    () =>
      amapData.places.find((place) => place.id === selectedPlaceId) ||
      amapData.places[0] ||
      demoPlaces[0],
    [amapData.places, selectedPlaceId],
  );
  const trtcVoice = useTrtcVoice({
    enabled: trtcReady,
    muted,
    roomCode: room?.code || code,
    userId: member?.id,
  });

  const patchPlanning = (patch: RoomStatePatch) => {
    void updatePlanning(patch).catch(() => undefined);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 2200);
  };

  const requestAgentPlan = async (choiceId: string) => {
    setAgentThinking(true);
    setAgentNote(null);

    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amapContext: {
            places: amapData.places
              .filter((place) => place.sourceStatus === "ready")
              .map((place) => ({
                id: place.id,
                name: place.name,
                address: place.address,
                category: place.category,
                location: place.location,
                businessHours: place.businessHours,
              })),
            routeStats: amapData.routeStats,
            weather: amapData.weatherText,
          },
          currentPlan: activeRoute,
          preferences: demoPreferences,
          roomSummary: `当前选择方向：${choiceId}。团队正在规划北京一日同行，偏好人文古迹、减少步行和本地餐饮。`,
        }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as {
        plan?: { summary?: string; routeIntent?: string };
      };
      setAgentNote(data.plan?.summary || data.plan?.routeIntent || null);
    } finally {
      setAgentThinking(false);
    }
  };

  const chooseDirection = (choiceId: string) => {
    patchPlanning({
      selectedChoiceId: choiceId,
      activeRouteId: routeIdForChoice(choiceId),
    });
    void requestAgentPlan(choiceId);
  };

  const handleMicClick = () => {
    if (!trtcReady) {
      setMuted(!muted);
      showNotice("已切换本地麦克风状态；配置 TRTC 后会进入真实语音房间。");
      return;
    }

    if (!trtcVoice.isConnected) {
      void trtcVoice.join().then(() => {
        if (muted) setMuted(false);
      });
      return;
    }

    setMuted(!muted);
    showNotice(muted ? "麦克风已打开" : "麦克风已关闭");
  };

  const openAmapSearch = () => {
    window.open(
      `https://www.amap.com/search?query=${encodeURIComponent(
        selectedPlace.name,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const leaveRoom = () => {
    void trtcVoice.leave();
    router.push("/");
  };

  const voiceLabel = trtcVoice.isJoining
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
            aria-label="通知"
            className="icon-button"
            onClick={() => showNotice("暂无新通知，AI 会保持低打扰同步。")}
            type="button"
          >
            <Bell size={18} />
            <span className="notification-dot" />
          </button>
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
              <button
                className={summaryTab === "summary" ? "is-active" : ""}
                onClick={() => setSummaryTab("summary")}
                type="button"
              >
                协作摘要
              </button>
              <button
                className={summaryTab === "route" ? "is-active" : ""}
                onClick={() => setSummaryTab("route")}
                type="button"
              >
                路线
              </button>
            </div>
            <button
              aria-label="收起侧栏"
              className="icon-button subtle"
              onClick={() => showNotice("移动端会自动收起侧栏，桌面版暂保持完整视图。")}
              type="button"
            >
              <PanelLeftClose size={17} />
            </button>
          </div>

          <div className="sidebar-scroll">
            {summaryTab === "summary" ? (
              <>
                <section className="listening-card">
                  <div className="listening-ambient" />
                  <div className="listening-header">
                    <span className="ai-orb">
                      <Sparkles size={17} />
                    </span>
                    <div>
                      <strong>AI 正在倾听</strong>
                      <span>低打扰整理 · 不展示逐字转写</span>
                    </div>
                    <span className="listening-live">
                      <i />
                      {syncLabel}
                    </span>
                  </div>
                  <div className="sound-wave" aria-hidden="true">
                    {Array.from({ length: 28 }).map((_, index) => (
                      <i key={index} />
                    ))}
                  </div>
                  <div className="speaker-now">
                    <span
                      className="speaker-avatar"
                      style={
                        { "--avatar-color": activeSpeaker.color } as CSSProperties
                      }
                    >
                      {activeSpeaker.initials}
                    </span>
                    <span>
                      <strong>{activeSpeaker.name} 正在参与讨论</strong>
                      <small>有新共识时，地图会在旁边轻量更新</small>
                    </span>
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
                      <strong>当前共识</strong>
                    </div>
                    <span>{planning ? "刚才同步" : "等待同步"}</span>
                  </div>
                  <div className="consensus-card">
                    <div className="consensus-primary">
                      <span className="consensus-icon">
                        <Compass size={18} />
                      </span>
                      <div>
                        <strong>北京 · 一日同行</strong>
                        <span>核心方向已初步确认</span>
                      </div>
                    </div>
                    <div className="consensus-meta">
                      <span>
                        <CalendarDays size={14} />
                        周末
                      </span>
                      <span>
                        <UsersRound size={14} />
                        {onlineMembers.length} 人在线
                      </span>
                    </div>
                  </div>
                </section>

                <section className="sidebar-section">
                  <div className="section-title">
                    <div>
                      <ListFilter size={16} />
                      <strong>团队偏好</strong>
                    </div>
                    <button
                      onClick={() => showNotice("偏好编辑将在 AI 真实摘要接入后开放。")}
                      type="button"
                    >
                      调整
                    </button>
                  </div>
                  <div className="preference-list">
                    {demoPreferences.map((preference) => (
                      <div className="preference-row" key={preference.id}>
                        <span>{preference.label}</span>
                        <div className="preference-track">
                          <i
                            style={{ width: `${preference.weight * 20}%` }}
                          />
                        </div>
                        <b>{preference.weight}/5</b>
                      </div>
                    ))}
                  </div>
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
                    <strong>路线方案</strong>
                    <span>根据当前共识生成的产品预览</span>
                  </div>
                </div>
                <div className="route-variant-list">
                  {demoRoutes.map((route) => (
                    <button
                      className={route.id === activeRouteId ? "is-active" : ""}
                      key={route.id}
                      onClick={() => patchPlanning({ activeRouteId: route.id })}
                      type="button"
                    >
                      <span
                        className="route-color"
                        style={{ background: route.color }}
                      />
                      <span>
                        <strong>{route.name}</strong>
                        <small>{route.description}</small>
                      </span>
                      {route.id === activeRouteId ? (
                        <Check size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  ))}
                </div>
                <div className="route-steps">
                  {activeRoute.placeIds.map((placeId, index) => {
                    const place = demoPlaces.find((item) => item.id === placeId);
                    if (!place) return null;
                    return (
                      <button
                        key={place.id}
                        onClick={() => patchPlanning({ selectedPlaceId: place.id })}
                        type="button"
                      >
                        <b style={{ background: place.accent }}>{index + 1}</b>
                        <span>
                          <strong>{place.name}</strong>
                          <small>{place.category} · {place.area}</small>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </aside>

        <div className="map-workspace">
          <div className="map-toolbar">
            <button
              aria-label="当前目的地：北京"
              className="location-context"
              onClick={() => showNotice("目的地城市暂锁定为北京，后续可通过语音改城市。")}
              type="button"
            >
              <span>
                <MapPin size={16} />
              </span>
              <div>
                <small>当前目的地</small>
                <strong>北京</strong>
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
              <kbd>⌘ K</kbd>
            </label>
            <div className="weather-pill">
              <CloudSun size={17} />
              <span>{amapData.weatherText}</span>
            </div>
          </div>
          <MapCanvas
            activeRoute={activeRoute}
            onSelectPlace={(placeId) => patchPlanning({ selectedPlaceId: placeId })}
            onNotify={showNotice}
            places={amapData.places}
            selectedPlaceId={selectedPlaceId}
          />
        </div>

        <aside className="insight-sidebar">
          <div className="insight-scroll">
            <section className="choice-card">
              <div className="choice-card-topline">
                <span>
                  <Sparkles size={15} />
                  轻提示
                </span>
                <button
                  aria-label="更多"
                  className="icon-button subtle"
                  onClick={() => showNotice("AI 轻提示会按讨论进展自动更新。")}
                  type="button"
                >
                  <Ellipsis size={17} />
                </button>
              </div>
              <h2>如果方便，确认一个方向</h2>
              <p>你们可以继续聊。这个提示只在旁边等待，需要时再点选，不会打断讨论。</p>
              <div className="choice-options">
                {demoChoices.map((choice) => {
                  const Icon =
                    choiceIcons[choice.icon as keyof typeof choiceIcons] ||
                    MessageCircleQuestion;
                  return (
                    <button
                      className={selectedChoiceId === choice.id ? "is-selected" : ""}
                      key={choice.id}
                      onClick={() => chooseDirection(choice.id)}
                      type="button"
                    >
                      <span>
                        <Icon size={17} />
                      </span>
                      <span>
                        <strong>{choice.label}</strong>
                        <small>{choice.description}</small>
                      </span>
                      {selectedChoiceId === choice.id ? (
                        <Check size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedChoiceId && (
                <div className="choice-feedback">
                  <CheckCircle2 size={15} />
                  {agentThinking
                    ? "已记录，AI 正在安静整理"
                    : agentNote || "已记录，地图已轻量更新"}
                </div>
              )}
            </section>

            <section className="place-detail-card">
              <div
                className={`place-visual ${
                  selectedPlace.photoUrl ? "has-photo" : ""
                }`}
                style={{ "--place-color": selectedPlace.accent } as CSSProperties}
              >
                {selectedPlace.photoUrl ? (
                  <img
                    alt={selectedPlace.name}
                    className="place-photo"
                    src={selectedPlace.photoUrl}
                  />
                ) : (
                  <>
                    <div className="place-visual-grid" />
                    <Landmark size={48} strokeWidth={1.5} />
                  </>
                )}
                <span>
                  {selectedPlace.photoUrl ? "高德图片" : "高德图片字段接入位"}
                </span>
                <button
                  aria-label="查看外部详情"
                  onClick={openAmapSearch}
                  type="button"
                >
                  <SquareArrowOutUpRight size={16} />
                </button>
              </div>
              <div className="place-detail-content">
                <div className="place-title-row">
                  <div>
                    <span>{selectedPlace.category}</span>
                    <h2>{selectedPlace.name}</h2>
                  </div>
                  <span className="pending-source">
                    <ShieldCheck size={13} />
                    {selectedPlace.sourceStatus === "ready"
                      ? "高德已返回"
                      : "高德待接入"}
                  </span>
                </div>
                <p>{selectedPlace.description}</p>
                <div className="place-data-grid">
                  <div>
                    <MapPin size={15} />
                    <span>
                      <small>区域</small>
                      <strong>{selectedPlace.address || selectedPlace.area}</strong>
                    </span>
                  </div>
                  <div>
                    <Clock3 size={15} />
                    <span>
                      <small>开放时间</small>
                      <strong>{selectedPlace.businessHours || "高德未返回"}</strong>
                    </span>
                  </div>
                  <div>
                    <Navigation2 size={15} />
                    <span>
                      <small>拥堵程度</small>
                      <strong>
                        {amapData.routeStats.durationText
                          ? `${amapData.routeStats.durationText} · ${
                              amapData.routeStats.distanceText || "路线已返回"
                            }`
                          : "等待路线数据"}
                      </strong>
                    </span>
                  </div>
                  <div>
                    <Flag size={15} />
                    <span>
                      <small>事实来源</small>
                      <strong>高德地图</strong>
                    </span>
                  </div>
                </div>
                <button
                  className="place-primary-action"
                  onClick={() => {
                    patchPlanning({ selectedPlaceId: selectedPlace.id });
                    showNotice(`${selectedPlace.name} 已保留在当前路线。`);
                  }}
                  type="button"
                >
                  <MapPin size={16} />
                  保留在当前路线
                  <Check size={15} />
                </button>
              </div>
            </section>

            <section className="trust-card">
              <span className="trust-icon">
                <ShieldCheck size={17} />
              </span>
              <div>
                <strong>事实数据边界</strong>
                <p>地点图片、营业信息、路线和交通仅展示高德实际返回内容。</p>
                {amapData.isLoading && <p>正在向高德同步地点与路线数据。</p>}
              </div>
            </section>
          </div>
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
              {trtcVoice.isConnected
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
            <span>{trtcVoice.isConnected ? "断开语音" : voiceLabel}</span>
          </button>
          <button
            className="call-control"
            onClick={() => showNotice("更多语音设置会在 TRTC 真机联调后开放。")}
            type="button"
          >
            <CircleEllipsis size={20} />
            <span>更多</span>
          </button>
          <button className="call-control leave" onClick={leaveRoom} type="button">
            <DoorOpen size={20} />
            <span>离开</span>
          </button>
        </div>
        <button
          className="finalize-button"
          onClick={() => setFinalOpen(true)}
          type="button"
        >
          <Sparkles size={17} />
          查看方案
          <ArrowRight size={17} />
        </button>
      </footer>

      <ShareDialog
        code={room?.code || code}
        onClose={() => setShareOpen(false)}
        open={shareOpen}
      />

      {finalOpen && (
        <div className="dialog-backdrop" onMouseDown={() => setFinalOpen(false)}>
          <section
            aria-modal="true"
            className="final-plan-dialog"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="final-plan-header">
              <div>
                <span className="dialog-kicker">当前路线方案</span>
                <h2>{roomTitle}</h2>
                <p>{activeRoute.description}</p>
              </div>
              <button
                aria-label="关闭"
                className="icon-button"
                onClick={() => setFinalOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="final-plan-body">
              <div className="final-plan-summary">
                <div>
                  <Route size={19} />
                  <span>
                    <small>路线方案</small>
                    <strong>{activeRoute.name}</strong>
                  </span>
                </div>
                <div>
                  <UsersRound size={19} />
                  <span>
                    <small>协作成员</small>
                    <strong>{onlineMembers.length} 人在线</strong>
                  </span>
                </div>
                <div>
                  <ShieldCheck size={19} />
                  <span>
                    <small>地点数据</small>
                    <strong>
                      {amapData.isConfigured ? "高德已接入" : "等待高德返回"}
                    </strong>
                  </span>
                </div>
              </div>
              <div className="final-timeline">
                {activeRoute.placeIds.map((placeId, index) => {
                  const place = amapData.places.find((item) => item.id === placeId);
                  if (!place) return null;
                  return (
                    <div className="final-timeline-item" key={place.id}>
                      <span style={{ background: place.accent }}>{index + 1}</span>
                      <div>
                        <strong>{place.name}</strong>
                        <small>
                          {place.category} · {place.area}
                        </small>
                      </div>
                      <button
                        onClick={() => {
                          patchPlanning({ selectedPlaceId: place.id });
                          setFinalOpen(false);
                          showNotice(`已切换到 ${place.name}`);
                        }}
                        type="button"
                      >
                        查看地点
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="final-plan-note">
                <Sparkles size={16} />
                当前方案已接入房间同步。配置 AI 与高德后，会依据真实讨论和路线数据继续实时生成。
              </div>
            </div>
            <footer className="final-plan-footer">
              <button className="secondary-button" onClick={() => setFinalOpen(false)}>
                继续讨论
              </button>
              <button
                className="primary-action"
                onClick={() => {
                  setShareOpen(true);
                  window.setTimeout(() => setFinalOpen(false), 0);
                }}
                type="button"
              >
                <Share2 size={17} />
                分享当前方案
              </button>
            </footer>
          </section>
        </div>
      )}
      {notice && (
        <div className="workspace-toast" role="status">
          <Sparkles size={14} />
          {notice}
        </div>
      )}
    </main>
  );
}
