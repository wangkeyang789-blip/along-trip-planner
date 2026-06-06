"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, Navigation2, Star, Clock, MapPin, X, Banknote, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import type { Waypoint } from "@/lib/types";

type MapCanvasProps = {
  waypoints: Waypoint[];
  routePolylines?: [number, number][][];
  selectedWaypointId: string | null;
  onSelectWaypoint: (waypointId: string) => void;
  onNotify?: (message: string) => void;
};

const COLORS = ["#7167f6", "#ff8c65", "#24b59f", "#2d7ff9", "#e64980", "#fab005"];

export function MapCanvas({
  waypoints,
  routePolylines = [],
  selectedWaypointId,
  onSelectWaypoint,
  onNotify,
}: MapCanvasProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapMode, setMapMode] = useState<"map" | "satellite">("map");
  const [zoomLevel, setZoomLevel] = useState(13);
  const [realMapState, setRealMapState] = useState<"disabled" | "loading" | "ready" | "error">("disabled");
  const [selectedWp, setSelectedWp] = useState<Waypoint | null>(null);

  const resolvedWaypoints = useMemo(
    () => waypoints.filter((wp) => wp.resolveStatus === "ready" && wp.location),
    [waypoints],
  );
  const routePath = useMemo(
    () => routePolylines.flat().filter((point) => point.length === 2),
    [routePolylines],
  );

  const onSelectWaypointRef = useRef(onSelectWaypoint);
  onSelectWaypointRef.current = onSelectWaypoint;
  const mapInstanceRef = useRef<any>(null);
  const amapApiRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Initialize real map once
  const mapInitRef = useRef(false);
  const polylineRef = useRef<any>(null);

  const standardLayerRef = useRef<any>(null);
  const fitViewOnceRef = useRef<number>(0);
  const jsKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
  const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE;
  const hasKey = Boolean(jsKey && jsKey.length > 0);

  useEffect(() => {
    if (mapInitRef.current || !hasKey || !mapRef.current) return;
    mapInitRef.current = true;
    setRealMapState("disabled");

    async function initMap() {
      if (!mapRef.current) return;
      setRealMapState("loading");
      try {
        if (securityJsCode) {
          (window as typeof window & { _AMapSecurityConfig?: { securityJsCode: string } }
          )._AMapSecurityConfig = { securityJsCode };
        }
        const { load } = await import("@amap/amap-jsapi-loader");
        const AMap = await load({
          key: jsKey as string,
          version: "2.0",
          plugins: ["AMap.Scale", "AMap.ToolBar"],
        });
        if (!mapRef.current) return;
        amapApiRef.current = AMap;
        const map = new AMap.Map(mapRef.current, {
          center: [116.397, 39.916],
          mapStyle: "amap://styles/normal",
          resizeEnable: true,
          viewMode: "3D",
          zoom: 13,
          features: ["bg", "road", "building", "point"],
          showBuildingBlock: true,
        });
        mapInstanceRef.current = map;
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({
          position: { bottom: "84px", right: "18px" },
        }));

        // Close detail panel when clicking map blank area
        map.on("click", (e: any) => {
          // e.target === map means clicked on blank area, not on marker/overlay
          if (e && e.target === map) {
            setSelectedWp(null);
          }
        });

        setRealMapState("ready");
      } catch {
        setRealMapState("error");
      }
    }
    void initMap();
  }, [hasKey, jsKey, securityJsCode]);

  // Update markers/polyline when waypoints change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const AMap = amapApiRef.current;
    if (!map || !AMap) return;
    markersRef.current.forEach((m: any) => { try { map.remove(m); } catch {} });
    markersRef.current = [];
    if (polylineRef.current) {
      try { map.remove(polylineRef.current); } catch {}
      polylineRef.current = null;
    }
    if (resolvedWaypoints.length === 0) { fitViewOnceRef.current = 0; return; }

    const markers: any[] = [];
    resolvedWaypoints.forEach((wp, index) => {
      const marker = new AMap.Marker({
        anchor: "bottom-center",
        content: `<div class="amap-custom-marker">${index + 1}</div>`,
        position: wp.location,
        title: wp.name,
      });
      marker.on("click", () => {
        onSelectWaypointRef.current(wp.id);
        setSelectedWp(wp);
      });
      map.add(marker);
      markers.push(marker);
    });
    markersRef.current = markers;

    const polylinePath =
      routePath.length >= 2
        ? routePath
        : resolvedWaypoints.map((wp) => wp.location).filter(Boolean);

    if (polylinePath.length >= 2) {
      const isSatellite = mapMode === "satellite";
      const polyline = new AMap.Polyline({
        borderColor: isSatellite ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.7)",
        borderWeight: isSatellite ? 2 : 3,
        isOutline: true,
        lineJoin: "round",
        lineStyle: "solid",
        path: polylinePath,
        strokeColor: isSatellite ? "#FFD54F" : "#7167f6",
        strokeOpacity: isSatellite ? 0.75 : 0.45,
        strokeWeight: isSatellite ? 5 : 5,
      });
      map.add(polyline);
      polylineRef.current = polyline;
      // Fit view to show all waypoints
      // Only fit view when waypoint count changes, not on every re-render
      if (!fitViewOnceRef.current || fitViewOnceRef.current !== resolvedWaypoints.length) {
        fitViewOnceRef.current = resolvedWaypoints.length;
        map.setFitView([polyline], false, [60, 60, 120, 60]);
      }
    }
  }, [resolvedWaypoints, routePath, mapMode]);

  const changeMode = (mode: "map" | "satellite") => {
    setMapMode(mode);
    const map = mapInstanceRef.current;
    const AMap = amapApiRef.current;
    if (!map || !AMap) return;

    if (mode === "satellite") {
      map.setLayers([new AMap.TileLayer.Satellite()]);
    } else {
      if (!standardLayerRef.current) {
        standardLayerRef.current = new AMap.TileLayer({ lang: 'zh_cn' });
      }
      map.setLayers([standardLayerRef.current]);
      map.setMapStyle("amap://styles/normal");
      map.setFeatures(["bg", "road", "building", "point"]);
    }
  };

  const updateZoom = (zoom: number) => {
    const z = Math.max(3, Math.min(20, zoom));
    setZoomLevel(z);
    const map = mapInstanceRef.current;
    if (map) { map.setZoom(z); }
  };

  // Sync selectedWaypointId from parent to internal selectedWp
  useEffect(() => {
    if (!selectedWaypointId) {
      setSelectedWp(null);
      return;
    }
    const wp = waypoints.find((w) => w.id === selectedWaypointId);
    if (wp) setSelectedWp(wp);
  }, [selectedWaypointId, waypoints]);

  // Determine hero image source
  const heroImage = selectedWp
    ? (selectedWp.photoUrl || selectedWp.photos?.[0]?.url)
    : null;

  return (
    <section
      className={`map-canvas ${realMapState === "ready" ? "has-real-map" : ""}`}
      aria-label="路线地图"
    >
      <div
        className={`amap-real-layer ${realMapState === "ready" ? "is-ready" : ""}`}
        ref={mapRef}
      />

      {/* Fallback map when AMap is not available */}
      {realMapState !== "ready" && (
        <div className="fallback-map" aria-hidden="true">
          <svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            {/* Background */}
            <rect width="800" height="600" fill="#f5f3ed" />

            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e8e5dc" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="800" height="600" fill="url(#grid)" />

            {/* Water areas */}
            <ellipse cx="680" cy="120" rx="140" ry="90" fill="#dceeed" opacity="0.7" />
            <ellipse cx="120" cy="480" rx="100" ry="70" fill="#dceeed" opacity="0.5" />

            {/* Park / green areas */}
            <ellipse cx="220" cy="160" rx="80" ry="60" fill="#e8f0e4" opacity="0.6" />
            <ellipse cx="600" cy="420" rx="110" ry="80" fill="#e8f0e4" opacity="0.5" />

            {/* Roads */}
            <g stroke="#ddd8cc" strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M 0 300 Q 200 280 400 320 T 800 300" />
              <path d="M 400 0 Q 420 200 380 400 T 400 600" />
              <path d="M 0 150 L 800 180" strokeDasharray="6 6" />
              <path d="M 200 0 L 180 600" strokeDasharray="6 6" />
              <path d="M 600 0 L 620 600" strokeDasharray="6 6" />
              <path d="M 0 450 Q 300 420 500 480 T 800 440" />
            </g>

            {/* Main route path */}
            <path
              d="M 280 380 Q 360 300 440 260 T 580 180"
              fill="none"
              stroke="#7167f6"
              strokeWidth="3"
              strokeDasharray="8 6"
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Decorative road labels */}
            <text x="420" y="20" fill="#c4bfb3" fontSize="9" fontWeight="600" transform="rotate(2 420 20)">情侣中路</text>
            <text x="20" y="295" fill="#c4bfb3" fontSize="9" fontWeight="600">海滨路</text>
            <text x="640" y="20" fill="#c4bfb3" fontSize="9" fontWeight="600">景山路</text>

            {/* City name */}
            <text
              x="400"
              y="200"
              textAnchor="middle"
              fill="#d3cfc5"
              fontSize="72"
              fontWeight="800"
              letterSpacing="8"
              style={{ fontFamily: "var(--font-sans), sans-serif" }}
            >
              珠海
            </text>
            <text
              x="400"
              y="235"
              textAnchor="middle"
              fill="#c4bfb3"
              fontSize="11"
              fontWeight="600"
              letterSpacing="3"
            >
              ZHUHAI
            </text>

            {/* Sample markers */}
            <g transform="translate(280, 380)">
              <circle r="18" fill="#7167f6" opacity="0.15" />
              <circle r="8" fill="#7167f6" />
              <text y="3" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">1</text>
            </g>
            <g transform="translate(440, 260)">
              <circle r="18" fill="#ff8c65" opacity="0.15" />
              <circle r="8" fill="#ff8c65" />
              <text y="3" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">2</text>
            </g>
            <g transform="translate(580, 180)">
              <circle r="18" fill="#24b59f" opacity="0.15" />
              <circle r="8" fill="#24b59f" />
              <text y="3" textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">3</text>
            </g>

            {/* Compass */}
            <g transform="translate(720, 520)">
              <circle r="22" fill="#fff" stroke="#e8e5dc" strokeWidth="1.5" />
              <polygon points="0,-14 -4,4 0,2 4,4" fill="#ef4444" />
              <polygon points="0,14 -4,-4 0,-2 4,-4" fill="#9aa2b2" />
              <text y="-17" textAnchor="middle" fill="#9aa2b2" fontSize="7" fontWeight="700">N</text>
            </g>

            {/* Scale bar */}
            <g transform="translate(60, 540)">
              <rect x="0" y="0" width="60" height="4" fill="#fff" rx="2" />
              <rect x="0" y="0" width="30" height="4" fill="#c4bfb3" rx="2" />
              <text x="30" y="16" textAnchor="middle" fill="#9aa2b2" fontSize="8" fontWeight="600">1 km</text>
            </g>
          </svg>
        </div>
      )}

      {/* Loading overlay */}
      {realMapState === "loading" && (
        <div className="map-loading-overlay">
          <Loader2 size={28} className="map-spinner" />
          <p>正在加载地图…</p>
        </div>
      )}

      {/* Error overlay */}
      {realMapState === "error" && (
        <div className="map-error-overlay">
          <AlertCircle size={28} />
          <p>地图加载失败</p>
          <button
            className="map-error-retry"
            onClick={() => {
              mapInitRef.current = false;
              setRealMapState("disabled");
            }}
            type="button"
          >
            <RefreshCw size={12} />
            重试
          </button>
        </div>
      )}

      {/* No-key hint overlay */}
      {realMapState === "disabled" && !hasKey && (
        <div className="map-nokey-hint">
          <MapPin size={20} />
          <p>
            地图服务需配置高德 API Key
            <br />
            <span>请在 .env.local 中设置 NEXT_PUBLIC_AMAP_JS_KEY</span>
          </p>
        </div>
      )}

      {realMapState !== "ready" && resolvedWaypoints.length === 0 && (
        <div className="map-empty-hint">
          <Navigation2 size={32} />
          <p>等待 AI 规划路线…</p>
        </div>
      )}

      {/* ===== Custom Detail Panel V2 ===== */}
      {selectedWp && (
        <div className="map-detail-panel-v2">
          {/* Close button */}
          <button
            className="map-detail-panel-v2-close"
            onClick={() => setSelectedWp(null)}
            type="button"
            aria-label="关闭详情"
          >
            <X size={16} />
          </button>

          {/* Searching skeleton */}
          {selectedWp.resolveStatus === "searching" && (
            <div className="map-detail-panel-v2-skeleton">
              <div className="v2-skeleton-hero" />
              <div className="v2-skeleton-title" />
              <div className="v2-skeleton-line" />
              <div className="v2-skeleton-line short" />
            </div>
          )}

          {/* Not found state */}
          {selectedWp.resolveStatus === "not_found" && (
            <div className="map-detail-panel-v2-empty">
              <MapPin size={32} color="#ccc" />
              <p>暂无详细信息</p>
              <span>该地点暂时无法获取详情</span>
            </div>
          )}

          {/* Ready state */}
          {selectedWp.resolveStatus === "ready" && (
            <>
              {/* Hero image */}
              {heroImage ? (
                <div className="map-detail-panel-v2-hero">
                  <img src={heroImage} alt={selectedWp.name} />
                </div>
              ) : (
                <div className="map-detail-panel-v2-hero placeholder">
                  <MapPin size={28} color="#ccc" />
                </div>
              )}

              {/* Title + rating */}
              <div className="map-detail-panel-v2-title-row">
                <h3>{selectedWp.name}</h3>
                {selectedWp.rating && (
                  <span className="map-detail-panel-v2-rating">
                    <Star size={14} fill="#ff8c00" color="#ff8c00" />
                    {selectedWp.rating}
                  </span>
                )}
              </div>

              {/* Tags */}
              {selectedWp.category && (
                <div className="map-detail-panel-v2-tags">
                  <span className="v2-tag">{selectedWp.category}</span>
                </div>
              )}

              {/* Info rows */}
              <div className="map-detail-panel-v2-info">
                {selectedWp.address && (
                  <div className="v2-info-row">
                    <MapPin size={14} color="#888" />
                    <span>{selectedWp.address}</span>
                  </div>
                )}
                {selectedWp.businessHours && (
                  <div className="v2-info-row">
                    <Clock size={14} color="#888" />
                    <span>{selectedWp.businessHours}</span>
                  </div>
                )}
                {selectedWp.cost && (
                  <div className="v2-info-row">
                    <Banknote size={14} color="#888" />
                    <span>{selectedWp.cost}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedWp.description && (
                <div className="map-detail-panel-v2-desc">
                  <p>{selectedWp.description}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {realMapState === "ready" && (
        <div className="map-mode-switch" role="group" aria-label="地图模式">
          <button className={mapMode === "map" ? "is-active" : ""} onClick={() => changeMode("map")} type="button">标准</button>
          <button className={mapMode === "satellite" ? "is-active" : ""} onClick={() => changeMode("satellite")} type="button">卫星</button>
        </div>
      )}


    </section>
  );
}
