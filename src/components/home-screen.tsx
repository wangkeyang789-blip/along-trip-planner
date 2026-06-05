"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  AudioLines,
  Check,
  ChevronRight,
  Link2,
  MessageCircleQuestion,
  Mic2,
  Route,
  ScanLine,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import type { JoinRoomResponse } from "@/lib/room-contracts";
import {
  createLocalMemberId,
  saveStoredRoomMember,
} from "@/lib/room-client";

const previewSignals = [
  { icon: Mic2, label: "自然语音讨论", tone: "violet" },
  { icon: Sparkles, label: "AI 轻声整理", tone: "coral" },
  { icon: Route, label: "地图安静更新", tone: "mint" },
];

export function HomeScreen() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const createRoom = async () => {
    setIsCreating(true);
    setCreateError(null);

    try {
      const memberId = createLocalMemberId();
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          hostName: "林澈",
          title: "北京周末同行",
        }),
      });
      const data = (await response.json()) as JoinRoomResponse;

      if (!response.ok) {
        throw new Error("CREATE_ROOM_FAILED");
      }

      saveStoredRoomMember(data.room.code, {
        id: data.member.id,
        name: data.member.name,
      });
      router.push(`/room/${encodeURIComponent(data.room.code)}`);
    } catch {
      setCreateError("创建房间失败，请稍后重试。");
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = joinCode.trim() || "ALONG-2026";
    router.push(`/join/${encodeURIComponent(code)}`);
  };

  return (
    <main className="home-page">
      <div className="home-orb home-orb-one" />
      <div className="home-orb home-orb-two" />
      <header className="home-header shell">
        <BrandLogo />
        <nav className="home-nav" aria-label="主导航">
          <a href="#how-it-works">工作方式</a>
          <a href="#product-preview">产品预览</a>
          <span className="status-pill">
            <span className="status-dot" />
            Demo 环境
          </span>
        </nav>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow">
            <AudioLines size={16} />
            让每个人的想法，安静地落在路线里
          </div>
          <h1>
            一边聊，
            <br />
            一边把旅行
            <span>计划好。</span>
          </h1>
          <p className="hero-description">
            邀请朋友进入语音房间。AI
            在一旁低打扰地理解共识、发现分歧，并把讨论逐渐转化为清晰可执行的旅行路线。
          </p>

          <div className="hero-actions">
            <button
              className="primary-action"
              disabled={isCreating}
              onClick={createRoom}
              type="button"
            >
              {isCreating ? "正在创建房间" : "创建规划房间"}
              <ArrowRight size={18} />
            </button>
            <form className="join-code-form" onSubmit={joinRoom}>
              <Link2 size={17} />
              <input
                aria-label="房间码"
                onChange={(event) => setJoinCode(event.target.value)}
                placeholder="输入房间码"
                value={joinCode}
              />
              <button aria-label="加入房间" type="submit">
                <ChevronRight size={18} />
              </button>
            </form>
          </div>
          {createError && <p className="inline-form-error">{createError}</p>}

          <div className="hero-signals">
            {previewSignals.map(({ icon: Icon, label, tone }) => (
              <div className="hero-signal" key={label}>
                <span className={`signal-icon ${tone}`}>
                  <Icon size={16} />
                </span>
                <span>{label}</span>
                <Check size={14} />
              </div>
            ))}
          </div>
        </div>

        <div className="hero-stage" id="product-preview">
          <div className="stage-glow" />
          <div className="stage-window">
            <div className="stage-window-header">
              <div className="mini-brand">
                <span className="mini-brand-mark" />
                同路协作间
              </div>
              <div className="stage-people">
                <span className="avatar avatar-violet">林</span>
                <span className="avatar avatar-coral">夏</span>
                <span className="avatar avatar-mint">周</span>
                <span className="avatar-count">+2</span>
              </div>
            </div>
            <div className="stage-window-body">
              <aside className="stage-sidebar">
                <div className="listener-card">
                  <div className="listener-topline">
                    <span className="ai-orb-small">
                      <Sparkles size={13} />
                    </span>
                    <span>AI 轻声整理中</span>
                  </div>
                  <div className="mini-wave" aria-hidden="true">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <i key={index} />
                    ))}
                  </div>
                </div>
                <div className="stage-summary">
                  <span className="stage-label">当前共识</span>
                  <strong>北京 · 一日同行</strong>
                  <div className="stage-tags">
                    <span>人文古迹</span>
                    <span>减少步行</span>
                    <span>本地餐饮</span>
                  </div>
                </div>
                <div className="stage-route-list">
                  <div>
                    <b>1</b>
                    <span>故宫博物院</span>
                  </div>
                  <i />
                  <div>
                    <b>2</b>
                    <span>什刹海</span>
                  </div>
                  <i />
                  <div>
                    <b>3</b>
                    <span>鼓楼</span>
                  </div>
                </div>
              </aside>
              <div className="stage-map">
                <div className="map-water map-water-home" />
                <div className="map-grid" />
                <svg
                  className="stage-route-line"
                  viewBox="0 0 600 460"
                  aria-hidden="true"
                >
                  <path d="M130 95 C210 90, 245 155, 275 205 S330 320, 440 350" />
                </svg>
                <span className="stage-pin stage-pin-one">1</span>
                <span className="stage-pin stage-pin-two">2</span>
                <span className="stage-pin stage-pin-three">3</span>
                <div className="stage-choice">
                  <div className="stage-choice-icon">
                    <MessageCircleQuestion size={17} />
                  </div>
                  <div>
                    <span>轻提示</span>
                    <strong>如果方便，可以先确认通勤和经典地点的取舍。</strong>
                  </div>
                  <button
                    disabled={isCreating}
                    onClick={() => void createRoom()}
                    type="button"
                  >
                    少走一点
                  </button>
                  <button
                    disabled={isCreating}
                    onClick={() => void createRoom()}
                    type="button"
                  >
                    保留经典
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="floating-note floating-note-share">
            <span>
              <ScanLine size={17} />
            </span>
            微信扫码加入
          </div>
          <div className="floating-note floating-note-live">
            <span>
              <UsersRound size={17} />
            </span>
            5 人正在协作
          </div>
        </div>
      </section>

      <section className="home-proof shell" id="how-it-works">
        <div>
          <span className="proof-number">01</span>
          <div>
            <strong>分享房间</strong>
            <p>链接或二维码，朋友无需注册即可加入。</p>
          </div>
        </div>
        <div>
          <span className="proof-number">02</span>
          <div>
            <strong>自然讨论</strong>
            <p>AI 只保留轻量状态，不抢话，也不展示逐字转写。</p>
          </div>
        </div>
        <div>
          <span className="proof-number">03</span>
          <div>
            <strong>一起确认</strong>
            <p>路线随共识更新，重要选择交给每个人决定。</p>
          </div>
        </div>
      </section>
    </main>
  );
}
