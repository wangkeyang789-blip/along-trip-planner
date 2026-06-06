"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, Navigation2, Star, Clock, MapPin, X, Banknote } from "lucide-react";
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

  useEffect(() => {
    if (mapInitRef.current || !jsKey || !mapRef.current) return;
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
  }, []);

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

      {/* SVG decorative path - only shown when real map is not loaded */}
      {realMapState !== "ready" && resolvedWaypoints.length >= 2 && (
        <svg className="route-svg" viewBox="0 0 840 660" aria-hidden="true">
          <path
            className="route-active"
            d={resolvedWaypoints
              .map((wp, i) =>
                i === 0
                  ? `M${40 + i * 30} ${50 + (i % 3) * 30}`
                  : `L${40 + i * 30} ${50 + (i % 3) * 30}`,
              )
              .join(" ")}
            style={{ stroke: "#7167f6" }}
          />
        </svg>
      )}

      {/* Waypoint markers (fallback when no Amap) */}
      {realMapState !== "ready" &&
        resolvedWaypoints.map((wp, index) => (
          <button
            className={`map-poi ${wp.id === selectedWaypointId ? "is-selected" : ""}`}
            key={wp.id}
            onClick={() => {
              onSelectWaypoint(wp.id);
              setSelectedWp(wp);
            }}
            style={{
              left: `${20 + (index % 5) * 15}%`,
              top: `${30 + (index % 4) * 15}%`,
              "--poi-accent": COLORS[index % COLORS.length],
            } as React.CSSProperties}
            type="button"
          >
            <span className="map-poi-pin">{index + 1}</span>
            <span className="map-poi-label">
              <strong>{wp.name}</strong>
            </span>
          </button>
        ))}

      {resolvedWaypoints.length === 0 && (
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

      <div className="map-mode-switch" role="group" aria-label="地图模式">
        <button className={mapMode === "map" ? "is-active" : ""} onClick={() => changeMode("map")} type="button">标准</button>
        <button className={mapMode === "satellite" ? "is-active" : ""} onClick={() => changeMode("satellite")} type="button">卫星</button>

      </div>


    </section>
  );
}
