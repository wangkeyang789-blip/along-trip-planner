"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, Navigation2, Star, Clock, MapPin, Phone, X } from "lucide-react";
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
  const infoWindowRef = useRef<any>(null);

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
        showInfoWindow(map, wp, marker, index);
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

  function showInfoWindow(map: any, wp: Waypoint, marker: any, index: number) {
    const AMap = amapApiRef.current;
    if (!AMap) return;

    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    var photoHtml = "";
    if (wp.photoUrl) {
      photoHtml = `<div class="info-photo"><img src="${wp.photoUrl}" alt="${wp.name}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px" /></div>`;
    } else if (wp.photos && wp.photos.length > 0) {
      photoHtml = `<div class="info-photo"><img src="${wp.photos[0].url}" alt="${wp.name}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px" /></div>`;
    }
    var ratingHtml = wp.rating ? `<span style="display:inline-flex;align-items:center;gap:3px;color:#ff8c00;font-size:13px"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>${wp.rating}</span>` : "";
    var hoursHtml = wp.businessHours ? `<span style="display:flex;align-items:center;gap:3px;color:#666;font-size:12px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>${wp.businessHours}</span>` : "";
    var addressHtml = wp.address ? `<span style="display:flex;align-items:center;gap:3px;color:#666;font-size:12px;margin-top:4px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${wp.address}</span>` : "";
    var descHtml = wp.description ? `<p style="margin:6px 0 0;font-size:12px;color:#444;line-height:1.4">${wp.description}</p>` : "";

    var infoHtml = `
      <div style="min-width:220px;max-width:300px;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
        ${photoHtml}
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <strong style="font-size:15px;color:#222">${index + 1}. ${wp.name}</strong>
          ${ratingHtml}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px">
          ${hoursHtml}
          ${wp.category ? `<span style="background:#f0f0f0;padding:1px 6px;border-radius:3px;font-size:11px;color:#666">${wp.category}</span>` : ""}
        </div>
        ${addressHtml}
        ${descHtml}
      </div>
    `;

    var infoWindow = new AMap.InfoWindow({
      content: infoHtml,
      offset: new AMap.Pixel(0, -30),
      size: new AMap.Size(300, 0),
      autoMove: true,
    });
    infoWindow.open(map, marker.getPosition());
    infoWindowRef.current = infoWindow;
  }

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

      {/* Selected waypoint detail panel */}
      {selectedWp && selectedWp.resolveStatus === "ready" && (
        <div className="map-detail-panel">
          <div className="map-detail-header">
            <div className="map-detail-header-left">
              <span className="map-detail-number">#{resolvedWaypoints.findIndex(w => w.id === selectedWp.id) + 1}</span>
              <div>
                <h3>{selectedWp.name}</h3>
                {selectedWp.rating && (
                  <span className="map-detail-stars">
                    <Star size={14} fill="#ff8c00" color="#ff8c00" />
                    <strong>{selectedWp.rating}</strong>
                    {selectedWp.category && <span className="map-detail-tag">{selectedWp.category}</span>}
                  </span>
                )}
              </div>
            </div>
            <button className="map-detail-close" onClick={() => setSelectedWp(null)} type="button">
              <X size={18} />
            </button>
          </div>
          {selectedWp.photoUrl && (
            <div className="map-detail-hero">
              <img src={selectedWp.photoUrl} alt={selectedWp.name} />
            </div>
          )}
          <div className="map-detail-body">
            {selectedWp.businessHours && (
              <div className="map-detail-row">
                <Clock size={15} />
                <span>{selectedWp.businessHours}</span>
              </div>
            )}
            {selectedWp.address && (
              <div className="map-detail-row">
                <MapPin size={15} />
                <span>{selectedWp.address}</span>
              </div>
            )}
            {selectedWp.description && (
              <p className="map-detail-desc">{selectedWp.description}</p>
            )}
          </div>
        </div>
      )}

      <div className="map-mode-switch" role="group" aria-label="地图模式">
        <button className={mapMode === "map" ? "is-active" : ""} onClick={() => changeMode("map")} type="button">标准</button>
        <button className={mapMode === "satellite" ? "is-active" : ""} onClick={() => changeMode("satellite")} type="button">卫星</button>
        
      </div>


    </section>
  );
}
