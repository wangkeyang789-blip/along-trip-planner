"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Star, MapPin, Clock, X } from "lucide-react";
import type { Waypoint } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  PlaceTag                                                           */
/* ------------------------------------------------------------------ */

type PlaceTagProps = {
  name: string;
  category?: string;
  onClick?: () => void;
  onHover?: () => void;
};

function getCategoryClass(category?: string): string {
  if (!category) return "place-tag--default";
  const c = category.toLowerCase();
  if (c.includes("风景") || c.includes("景点") || c.includes("名胜")) return "place-tag--scenic";
  if (c.includes("餐") || c.includes("美食") || c.includes("食")) return "place-tag--food";
  if (c.includes("酒店") || c.includes("住宿") || c.includes("旅馆") || c.includes("宾馆")) return "place-tag--hotel";
  if (c.includes("购物") || c.includes("商场") || c.includes("买")) return "place-tag--shopping";
  return "place-tag--default";
}

export function PlaceTag({ name, category, onClick, onHover }: PlaceTagProps) {
  return (
    <span
      className={`place-tag ${getCategoryClass(category)}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={onHover}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {name}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  PlaceTooltip                                                       */
/* ------------------------------------------------------------------ */

type PlaceTooltipProps = {
  place: Waypoint;
  visible: boolean;
  onClose?: () => void;
};

export function PlaceTooltip({ place, visible, onClose }: PlaceTooltipProps) {
  return (
    <div className={`place-tooltip ${visible ? "is-visible" : ""}`}>
      {place.photoUrl && (
        <img
          src={place.photoUrl}
          alt={place.name}
          className="place-tooltip-photo"
          loading="lazy"
        />
      )}
      <div className="place-tooltip-name">{place.name}</div>
      {place.rating && (
        <div className="place-tooltip-rating">
          <Star size={12} fill="#f59e0b" />
          <span>{place.rating}</span>
        </div>
      )}
      {place.category && (
        <span className="place-tooltip-category">{place.category}</span>
      )}
      {place.description && (
        <p className="place-tooltip-desc">{place.description}</p>
      )}
      <div
        className="place-tooltip-link"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose?.();
          }
        }}
      >
        在地图中查看 →
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  highlightPlacesInText                                              */
/* ------------------------------------------------------------------ */

export function highlightPlacesInText(
  text: string,
  places: Array<{ name: string; category?: string }>,
  renderTag: (name: string, category?: string, key?: string) => React.ReactNode,
): React.ReactNode[] {
  if (!text || places.length === 0) return [text];

  // Sort by name length descending so longer matches take priority
  const sorted = [...places].sort((a, b) => b.name.length - a.name.length);

  const result: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    let bestMatch: { name: string; category?: string; index: number } | null = null;

    for (const p of sorted) {
      const idx = remaining.indexOf(p.name);
      if (idx !== -1 && (bestMatch === null || idx < bestMatch.index)) {
        bestMatch = { name: p.name, category: p.category, index: idx };
      }
    }

    if (!bestMatch) {
      result.push(remaining);
      break;
    }

    if (bestMatch.index > 0) {
      result.push(remaining.slice(0, bestMatch.index));
    }

    const key = `place-${keyIndex++}`;
    result.push(renderTag(bestMatch.name, bestMatch.category, key));

    remaining = remaining.slice(bestMatch.index + bestMatch.name.length);
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  ChatMessageWithPlaces                                              */
/* ------------------------------------------------------------------ */

type ChatMessageWithPlacesProps = {
  userName: string;
  userColor: string;
  userInitial: string;
  text: string;
  waypoints: Waypoint[];
  onPlaceClick?: (waypoint: Waypoint) => void;
};

export function ChatMessageWithPlaces({
  userName,
  userColor,
  userInitial,
  text,
  waypoints,
  onPlaceClick,
}: ChatMessageWithPlacesProps) {
  const [hoveredPlace, setHoveredPlace] = useState<Waypoint | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagRefs = useRef<Map<string, HTMLSpanElement | null>>(new Map());

  const handleMouseEnter = useCallback((wp: Waypoint) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setHoveredPlace(wp);
    setTooltipVisible(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipVisible(false);
    }, 150);
  }, []);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    };
  }, []);

  const matchedPlaces = waypoints
    .filter((wp) => text.includes(wp.name))
    .map((wp) => ({ name: wp.name, category: wp.category }));

  const segments = highlightPlacesInText(text, matchedPlaces, (name, category, key) => {
    const wp = waypoints.find((w) => w.name === name);
    if (!wp) return name;

    return (
      <span
        key={key}
        style={{ position: "relative", display: "inline" }}
        onMouseEnter={() => handleMouseEnter(wp)}
        onMouseLeave={handleMouseLeave}
        ref={(el) => {
          if (key) tagRefs.current.set(key, el);
        }}
      >
        <PlaceTag
          name={name}
          category={category}
          onClick={() => onPlaceClick?.(wp)}
          onHover={() => handleMouseEnter(wp)}
        />
        {hoveredPlace?.name === name && (
          <span
            style={{
              position: "absolute",
              left: 0,
              bottom: "100%",
              marginBottom: 6,
              zIndex: 100,
            }}
          >
            <PlaceTooltip
              place={wp}
              visible={tooltipVisible}
              onClose={() => onPlaceClick?.(wp)}
            />
          </span>
        )}
      </span>
    );
  });

  return (
    <div className="chat-message">
      <div
        className="chat-avatar"
        style={{ "--avatar-color": userColor } as React.CSSProperties}
      >
        {userInitial}
      </div>
      <div className="chat-bubble">
        <small>{userName}</small>
        <p>{segments}</p>
      </div>
    </div>
  );
}
