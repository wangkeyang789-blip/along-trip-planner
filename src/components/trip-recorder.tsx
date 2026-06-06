"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Mic,
  Square,
  Route,
  Compass,
  Sparkles,
  MapPin,
  CloudSun,
  Clock3,
  Flag,
  MessageCircleQuestion,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { useWebSpeech } from "@/hooks/use-web-speech";
import { useWaypointResolver } from "@/hooks/use-amap-data";
import { useRouteVariantRouting } from "@/hooks/use-route-variant-routing";
import { MapCanvas } from "@/components/map-canvas";
import { ChatMessageWithPlaces } from "@/components/chat-place-highlight";
import type { Waypoint } from "@/lib/types";
import type { RouteVariantSnapshot } from "@/lib/room-contracts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TranscriptEntry = {
  id: string;
  time: string; // HH:MM
  text: string;
};

type AgentPlan = {
  summary?: string;
  routeDescription?: string;
  city?: string;
  routeVariants?: RouteVariantSnapshot[];
};

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CITIES = ["珠海", "北京", "上海", "杭州", "厦门"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TripRecorder() {
  const speech = useWebSpeech();

  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [agentThinking, setAgentThinking] = useState(false);
  const [city, setCity] = useState("珠海");
  const [plan, setPlan] = useState<AgentPlan | null>(null);
  const [selectedWpId, setSelectedWpId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /* -------------------- Real-time transcript -------------------- */

  useEffect(() => {
    if (speech.isListening) {
      setCurrentTranscript(speech.transcript);
    }
  }, [speech.transcript, speech.isListening]);

  /* -------------------- Notice helper -------------------- */

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => {
      setNotice((current) => (current === message ? null : current));
    }, 2200);
  }, []);

  /* -------------------- Recording control -------------------- */

  const toggleRecording = useCallback(() => {
    if (speech.isListening) {
      speech.stop();
      if (currentTranscript.trim()) {
        setTranscriptLog((prev) => [
          ...prev,
          {
            id: generateId(),
            time: formatTime(new Date()),
            text: currentTranscript.trim(),
          },
        ]);
        setCurrentTranscript("");
      }
      void requestPlan();
    } else {
      speech.clear();
      setCurrentTranscript("");
      speech.start();
    }
  }, [speech, currentTranscript]);

  /* -------------------- AI Planning -------------------- */

  const requestPlan = useCallback(async () => {
    const logText = transcriptLog.map((t) => t.text).join("\n");
    const allText = logText + (currentTranscript ? "\n" + currentTranscript : "");
    if (allText.trim().length < 10) return;

    setAgentThinking(true);
    try {
      const response = await fetch("/api/ai/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "route",
          city,
          recentTurns: [
            {
              id: "turn-" + Date.now(),
              userId: "user",
              userName: "讨论",
              text: allText.trim(),
              createdAt: Date.now(),
            },
          ],
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        configured?: boolean;
        plan?: AgentPlan;
      };
      if (response.ok && data.plan) {
        setPlan(data.plan);
        if (data.plan.city && typeof data.plan.city === "string") {
          setCity(data.plan.city);
        }
      } else if (data.configured === false) {
        showNotice("AI API 未配置");
      }
    } catch (err) {
      console.warn("[TripRecorder] plan failed:", err);
      showNotice("AI 规划服务异常，稍后重试");
    } finally {
      setAgentThinking(false);
    }
  }, [transcriptLog, currentTranscript, city, showNotice]);

  /* -------------------- Clear log -------------------- */

  const clearLog = useCallback(() => {
    setTranscriptLog([]);
    setCurrentTranscript("");
    setPlan(null);
    setSelectedWpId(null);
    speech.clear();
    showNotice("已清空记录");
  }, [speech, showNotice]);

  /* -------------------- Waypoint resolution -------------------- */

  const planWaypoints = plan?.routeVariants?.[0]?.waypoints || [];
  const waypointInputs = planWaypoints.map((wp) => ({
    id: wp.id,
    name: wp.name,
    order: wp.order,
  }));
  const waypointResolver = useWaypointResolver(
    waypointInputs,
    city,
    plan?.routeVariants?.[0]?.id,
  );
  const resolvedWaypoints = waypointResolver.waypoints;

  /* -------------------- Route calculation -------------------- */

  const routedVariantState = useRouteVariantRouting(
    plan?.routeVariants?.[0] || null,
    resolvedWaypoints,
    city,
  );
  const routedVariant = routedVariantState.variant || plan?.routeVariants?.[0];
  const routePolylines =
    routedVariant?.segments
      ?.map((s) => s.polyline)
      .filter((polyline): polyline is [number, number][] => Boolean(polyline)) ||
    [];

  /* -------------------- Derived UI state -------------------- */

  const hasRoute = Boolean(routedVariant && routedVariant.waypoints.length > 0);
  const sortedWaypoints =
    routedVariant?.waypoints?.slice().sort((a, b) => a.order - b.order) || [];

  /* -------------------- Render -------------------- */

  return (
    <main className="workspace-page">
      {/* ===== Header ===== */}
      <header className="workspace-header">
        <div className="workspace-brand-area">
          <span className="brand-word">
            Along <small>同路</small>
          </span>
        </div>

        <div className="workspace-header-center">
          <span className="live-collaboration">
            <span className={`ai-indicator ${agentThinking ? "is-thinking" : ""}`} />
            {agentThinking ? "AI 规划中" : "准备就绪"}
          </span>
        </div>

        <div className="workspace-header-actions">
          <div className="city-selector">
            <MapPin size={14} />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="选择城市"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
      </header>

      {/* ===== Body ===== */}
      <div className="workspace-body">
        {/* ---- Left panel ---- */}
        <aside className="summary-sidebar recorder-sidebar">
          {/* Recording control */}
          <div className="recorder-control">
            <button
              className={`recorder-btn ${speech.isListening ? "is-recording" : ""}`}
              onClick={toggleRecording}
              type="button"
              aria-label={speech.isListening ? "停止录音" : "开始录音"}
            >
              {speech.isListening ? <Square size={28} /> : <Mic size={32} />}
            </button>
            <p className="recorder-label">
              {speech.isListening ? "正在录音…" : "点击开始录音"}
            </p>
            {speech.error && <p className="recorder-hint error">{speech.error}</p>}
            {speech.hint && <p className="recorder-hint">{speech.hint}</p>}
          </div>

          {/* Transcript log */}
          <div className="recorder-log">
            <div className="section-title">
              <div>
                <MessageCircleQuestion size={16} />
                <strong>讨论记录</strong>
              </div>
              {transcriptLog.length > 0 && (
                <button
                  className="recorder-clear-btn"
                  onClick={clearLog}
                  type="button"
                >
                  <Trash2 size={12} />
                  清空记录
                </button>
              )}
            </div>

            <div className="recorder-messages">
              {transcriptLog.length === 0 && !speech.isListening ? (
                <div className="recorder-empty">
                  <span>点击上方按钮开始录音，录下你和朋友的行程讨论</span>
                </div>
              ) : (
                <>
                  {transcriptLog.map((entry) => (
                    <div key={entry.id} className="recorder-entry">
                      <span className="recorder-entry-time">[{entry.time}]</span>
                      <ChatMessageWithPlaces
                        userName="讨论"
                        userColor="#75a7e8"
                        userInitial="讨"
                        text={entry.text}
                        waypoints={resolvedWaypoints}
                        onPlaceClick={(wp) => {
                          setSelectedWpId(wp.id);
                          showNotice(`已查看 ${wp.name}`);
                        }}
                      />
                    </div>
                  ))}
                  {speech.isListening && (
                    <div className="recorder-entry is-live">
                      <span className="recorder-entry-time">[{formatTime(new Date())}]</span>
                      <div className="chat-message">
                        <div
                          className="chat-avatar"
                          style={{ "--avatar-color": "#75a7e8" } as React.CSSProperties}
                        >
                          讨
                        </div>
                        <div className="chat-bubble">
                          <small>讨论</small>
                          <p>
                            {speech.interimText ? (
                              <span className="recorder-interim">{speech.interimText}</span>
                            ) : (
                              <span className="recorder-waiting">正在转写…</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* ---- Map ---- */}
        <div className="map-workspace">
          <div className="map-toolbar">
            <div className="location-context">
              <span>
                <MapPin size={16} />
              </span>
              <div>
                <small>当前目的地</small>
                <strong>{city}</strong>
              </div>
            </div>
            <div className="weather-pill">
              <CloudSun size={17} />
              <span>{waypointResolver.weatherText || "获取天气中…"}</span>
            </div>
          </div>
          <MapCanvas
            waypoints={resolvedWaypoints}
            routePolylines={routePolylines}
            selectedWaypointId={selectedWpId}
            onSelectWaypoint={(wpId) => setSelectedWpId(wpId)}
            onNotify={showNotice}
          />
        </div>

        {/* ---- Right panel ---- */}
        <aside className="route-sidebar recorder-route-sidebar">
          <div className="map-route-panel-header">
            <Route size={16} />
            <strong>行程单</strong>
            {hasRoute && (
              <button
                className="map-route-trigger-btn"
                onClick={() => void requestPlan()}
                type="button"
                disabled={agentThinking}
              >
                <Sparkles size={12} />
                {agentThinking ? "生成中…" : "重新生成"}
              </button>
            )}
          </div>

          {hasRoute ? (
            <div className="map-route-details">
              <div className="map-route-metrics">
                <span>
                  <Clock3 size={13} /> {routedVariant?.totalDurationText || "--"}
                </span>
                <span>
                  <Route size={13} /> {routedVariant?.totalDistanceText || "--"}
                </span>
                <span>
                  <Flag size={13} /> {routedVariant?.totalCostText || "--"}
                </span>
              </div>

              <div className="map-route-segments">
                {sortedWaypoints.map((wp, idx) => {
                  const resolved = resolvedWaypoints.find((rw) => rw.id === wp.id);
                  const seg =
                    routedVariant?.segments?.[idx - 1];
                  return (
                    <div
                      key={wp.id}
                      className="map-segment-item"
                      onClick={() => setSelectedWpId(wp.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedWpId(wp.id);
                        }
                      }}
                    >
                      <div className="map-segment-dot">
                        <b>{idx + 1}</b>
                        {idx < sortedWaypoints.length - 1 && <i />}
                      </div>
                      <div className="map-segment-info">
                        <strong>{wp.name}</strong>
                        <small>
                          {resolved?.resolveStatus === "ready"
                            ? resolved.address
                            : resolved?.resolveStatus === "not_found"
                              ? "未找到地址"
                              : "搜索中…"}
                        </small>
                        {seg && (
                          <span className="map-segment-route">
                            {seg.modeLabel}
                            {seg.durationText && " · " + seg.durationText}
                            {seg.distanceText && " · " + seg.distanceText}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="map-route-empty">
              <Compass size={32} />
              <p>开始录音讨论旅行计划</p>
              <small>AI 会根据讨论内容自动规划路线</small>
            </div>
          )}
        </aside>
      </div>

      {/* ===== Toast ===== */}
      {notice && (
        <div className="workspace-toast" role="status">
          <Sparkles size={14} />
          {notice}
        </div>
      )}

      {/* ===== Styles ===== */}
      <style jsx>{`
        .city-selector {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border: 1px solid var(--ink-200);
          border-radius: 10px;
          background: var(--white);
          color: var(--ink-700);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }
        .city-selector select {
          appearance: none;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: pointer;
          outline: none;
        }
        .recorder-sidebar {
          width: 320px;
        }
        .recorder-control {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 28px 16px 20px;
          border-bottom: 1px solid rgba(228, 230, 237, 0.72);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(250, 249, 255, 0.6));
        }
        .recorder-btn {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 200ms ease;
          border: 2px solid #ef4444;
          background: var(--white);
          color: #ef4444;
        }
        .recorder-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.18);
        }
        .recorder-btn.is-recording {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }
        .recorder-btn.is-recording::after {
          content: "";
          position: absolute;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 2px solid #ef4444;
          animation: recorder-pulse 1.5s ease-out infinite;
        }
        @keyframes recorder-pulse {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
          }
        }
        .recorder-label {
          margin: 0;
          color: var(--ink-600);
          font-size: 13px;
          font-weight: 600;
        }
        .recorder-hint {
          margin: 0;
          color: var(--ink-500);
          font-size: 11px;
          text-align: center;
          max-width: 260px;
        }
        .recorder-hint.error {
          color: #ef4444;
        }
        .recorder-log {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 12px 14px;
        }
        .recorder-clear-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border: 0;
          background: transparent;
          color: var(--ink-500);
          font-size: 11px;
          cursor: pointer;
          transition: color 150ms ease;
        }
        .recorder-clear-btn:hover {
          color: #ef4444;
        }
        .recorder-messages {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .recorder-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--ink-500);
          font-size: 12px;
          text-align: center;
          padding: 24px 12px;
        }
        .recorder-entry {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .recorder-entry-time {
          color: var(--ink-500);
          font-size: 10px;
          font-weight: 600;
          padding-left: 46px;
        }
        .recorder-interim {
          color: var(--ink-500);
          font-style: italic;
        }
        .recorder-waiting {
          color: var(--ink-400);
        }
        .recorder-route-sidebar {
          width: 280px;
        }
      `}</style>
    </main>
  );
}
