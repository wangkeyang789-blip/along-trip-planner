"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Check,
  Copy,
  Link2,
  MessageCircle,
  ScanLine,
  Share2,
  X,
} from "lucide-react";

type ShareDialogProps = {
  code: string;
  open: boolean;
  onClose: () => void;
};

export function ShareDialog({ code, open, onClose }: ShareDialogProps) {
  const [inviteUrl, setInviteUrl] = useState(`https://along.app/join/${code}`);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteUrl(`${window.location.origin}/join/${code}`);
    }
  }, [code]);

  if (!open) {
    return null;
  }

  const copyLink = async () => {
    await navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const systemShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "加入同路旅行规划房间",
        text: "和我们一起边聊边规划旅行",
        url: inviteUrl,
      });
      return;
    }
    await copyLink();
  };

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="share-title"
        aria-modal="true"
        className="share-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <span className="dialog-kicker">邀请成员</span>
            <h2 id="share-title">把朋友带进讨论</h2>
          </div>
          <button aria-label="关闭" className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="share-body">
          <div className="qr-panel">
            <div className="qr-frame">
              <QRCode
                bgColor="#ffffff"
                fgColor="#151c3b"
                size={156}
                value={inviteUrl}
              />
              <span className="qr-center-mark">
                <ScanLine size={17} />
              </span>
            </div>
            <strong>微信扫一扫加入</strong>
            <span>无需注册，输入称呼即可进入</span>
          </div>

          <div className="share-options">
            <div className="room-code-card">
              <span>房间码</span>
              <strong>{code}</strong>
              <small>今天 23:59 前有效</small>
            </div>
            <button className="share-option" onClick={copyLink} type="button">
              <span className="share-option-icon violet">
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </span>
              <span>
                <strong>{copied ? "链接已复制" : "复制邀请链接"}</strong>
                <small>发送到微信或其他聊天工具</small>
              </span>
              <Link2 size={17} />
            </button>
            <button className="share-option" onClick={systemShare} type="button">
              <span className="share-option-icon mint">
                <Share2 size={18} />
              </span>
              <span>
                <strong>使用系统分享</strong>
                <small>在手机上选择微信等应用</small>
              </span>
              <MessageCircle size={17} />
            </button>
          </div>
        </div>
        <footer className="share-footer">
          <span className="privacy-pulse" />
          只有拥有邀请链接的人可以加入此房间
        </footer>
      </section>
    </div>
  );
}
