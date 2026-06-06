"use client";

import { useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";

type ConfirmCardProps = {
  summary: string;
  themes: string[];
  city: string;
  onConfirm: (correctedText?: string) => void;
  onModify: (originalText: string) => void;
  isConfirmed?: boolean;
};

export function AiConfirmCard({
  summary,
  themes,
  city,
  onConfirm,
  onModify,
  isConfirmed,
}: ConfirmCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [confirmed, setConfirmed] = useState(isConfirmed || false);

  if (confirmed) {
    return (
      <div className="confirm-card confirmed">
        <span className="confirm-badge">
          <Check size={12} />
          已确认
        </span>
        <p className="confirm-summary">{summary}</p>
        {themes.length > 0 && (
          <div className="confirm-tags">
            {themes.map((t) => (
              <span key={t} className="confirm-tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="confirm-card">
      <div className="confirm-header">
        <span className="ai-orb-small">
          <Sparkles size={14} />
        </span>
        <strong>AI 理解确认</strong>
      </div>

      {!isEditing ? (
        <>
          <p className="confirm-summary">{summary}</p>
          {themes.length > 0 && (
            <div className="confirm-tags">
              {themes.map((t) => (
                <span key={t} className="confirm-tag">{t}</span>
              ))}
            </div>
          )}
          <div className="confirm-actions">
            <button
              className="confirm-btn confirm"
              onClick={() => {
                setConfirmed(true);
                onConfirm();
              }}
              type="button"
            >
              <Check size={14} />
              确认
            </button>
            <button
              className="confirm-btn modify"
              onClick={() => {
                setIsEditing(true);
                setEditText(summary);
              }}
              type="button"
            >
              <Pencil size={14} />
              修改
            </button>
          </div>
        </>
      ) : (
        <div className="confirm-edit-area">
          <textarea
            className="confirm-edit-input"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            placeholder="请修改 AI 的理解…"
          />
          <div className="confirm-edit-actions">
            <button
              className="confirm-btn confirm"
              onClick={() => {
                setConfirmed(true);
                setIsEditing(false);
                onConfirm(editText);
              }}
              type="button"
            >
              <Check size={14} />
              提交修改
            </button>
            <button
              className="confirm-btn cancel"
              onClick={() => {
                setIsEditing(false);
                setEditText("");
              }}
              type="button"
            >
              <X size={14} />
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
