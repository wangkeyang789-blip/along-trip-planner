"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layers3, LocateFixed, Minus, Navigation2, Plus } from "lucide-react";
import type { Place, RouteVariant } from "@/lib/types";

type MapCanvasProps = {
  activeRoute: RouteVariant;
  places: Place[];
  selectedPlaceId: string;
  onSelectPlace: (placeId: string) => void;
  onNotify?: (message: string) => void;
};

const routePaths: Record<string, string> = {
  balanced: "M340 185 C410 225, 350 320, 245 330 S180 455, 395 505",
  compact: "M245 330 C175 375, 235 455, 395 505 S460 300, 340 185",
  classic: "M340 185 C530 265, 630 435, 595 565 S455 555, 395 505",
};

export function MapCanvas({
  activeRoute,
  places,
  selectedPlaceId,
  onSelectPlace,
  onNotify,
}: MapCanvasProps) {
  const activePlaceIds = new Set(activeRoute.placeIds);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapMode, setMapMode] = useState<"map" | "satellite" | "traffic">("map");
  const [zoomLevel, setZoomLevel] = useState(13);
  const [realMapState, setRealMapState] = useState<
    "disabled" | "loading" | "ready" | "error"
  >("disabled");
  const activeRoutePlaces = useMemo(
    () =>
      activeRoute.placeIds
        .map((placeId) => places.find((place) => place.id === placeId))
        .filter((place): place is Place => Boolean(place?.location)),
    [activeRoute.placeIds, places],
  );

  useEffect(() => {
    let disposed = false;
    let mapInstance: { destroy: () => void } | null = null;
    const jsKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY;
    const securityJsCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_JS_CODE;

    if (!jsKey || !mapRef.current || activeRoutePlaces.length === 0) {
      setRealMapState("disabled");
      return undefined;
    }
    const amapJsKey = jsKey;

    async function loadRealMap() {
      setRealMapState("loading");

      try {
        if (securityJsCode) {
          (
            window as typeof window & {
              _AMapSecurityConfig?: { securityJsCode: string };
            }
          )._AMapSecurityConfig = { securityJsCode };
        }

        const { load } = await import("@amap/amap-jsapi-loader");
        const AMap = await load({
          key: amapJsKey,
          version: "2.0",
          plugins: ["AMap.Scale", "AMap.ToolBar"],
        });

        if (disposed || !mapRef.current) return;

        const center = activeRoutePlaces[0].location || [116.397, 39.916];
        const map = new AMap.Map(mapRef.current, {
          center,
          mapStyle: "amap://styles/whitesmoke",
          resizeEnable: true,
          viewMode: "2D",
          zoom: 13,
        });
        mapInstance = map;

        map.addControl(new AMap.Scale());
        map.addControl(
          new AMap.ToolBar({
            position: {
              bottom: "84px",
              right: "18px",
            },
          }),
        );

        activeRoutePlaces.forEach((place, index) => {
          const marker = new AMap.Marker({
            anchor: "bottom-center",
            content: `<div class="amap-custom-marker ${
              place.id === selectedPlaceId ? "is-selected" : ""
            }">${index + 1}</div>`,
            position: place.location,
            title: place.name,
          });
          marker.on("click", () => onSelectPlace(place.id));
          map.add(marker);
        });

        if (activeRoutePlaces.length >= 2) {
          const polyline = new AMap.Polyline({
            borderColor: "rgba(255,255,255,0.86)",
            borderWeight: 4,
            isOutline: true,
            lineJoin: "round",
            lineStyle: "solid",
            path: activeRoutePlaces.map((place) => place.location),
            strokeColor: activeRoute.color,
            strokeOpacity: 0.9,
            strokeWeight: 6,
          });
          map.add(polyline);
          map.setFitView([polyline]);
        }

        setRealMapState("ready");
      } catch {
        if (!disposed) {
          setRealMapState("error");
        }
      }
    }

    void loadRealMap();

    return () => {
      disposed = true;
      mapInstance?.destroy();
    };
  }, [activeRoute, activeRoutePlaces, onSelectPlace, selectedPlaceId]);

  const changeMode = (nextMode: "map" | "satellite" | "traffic") => {
    setMapMode(nextMode);
    const labels = {
      map: "已切换到地图模式",
      satellite: realMapState === "ready" ? "已请求卫星图层" : "卫星图层将在高德 JS Key 配置后启用",
      traffic: realMapState === "ready" ? "已请求路况图层" : "路况图层将在高德 JS Key 配置后启用",
    };
    onNotify?.(labels[nextMode]);
  };

  const updateZoom = (nextZoom: number) => {
    const normalizedZoom = Math.max(10, Math.min(17, nextZoom));
    setZoomLevel(normalizedZoom);
    onNotify?.(
      realMapState === "ready"
        ? `地图缩放级别 ${normalizedZoom}`
        : "预览地图已响应缩放，真实缩放需配置高德 JS Key",
    );
  };

  return (
    <section
      className={`map-canvas ${realMapState === "ready" ? "has-real-map" : ""}`}
      aria-label="路线地图预览"
    >
      <div
        className={`amap-real-layer ${
          realMapState === "ready" ? "is-ready" : ""
        }`}
        ref={mapRef}
      />
      <div className="map-grid map-grid-room" />
      <div className="map-water map-water-room-one" />
      <div className="map-water map-water-room-two" />
      <div className="map-park map-park-one">
        <span>北海公园</span>
      </div>
      <div className="map-park map-park-two">
        <span>景山公园</span>
      </div>
      <div className="map-road map-road-one" />
      <div className="map-road map-road-two" />
      <div className="map-road map-road-three" />
      <div className="map-road-label label-one">地安门西大街</div>
      <div className="map-road-label label-two">景山前街</div>
      <div className="map-road-label label-three">鼓楼西大街</div>

      <svg className="route-svg" viewBox="0 0 840 660" aria-hidden="true">
        <path className="route-shadow" d={routePaths[activeRoute.id]} />
        <path
          className="route-active"
          d={routePaths[activeRoute.id]}
          style={{ stroke: activeRoute.color }}
        />
      </svg>

      {places.map((place) => {
        const isActive = activePlaceIds.has(place.id);
        const isSelected = selectedPlaceId === place.id;
        return (
          <button
            className={`map-poi ${isActive ? "is-active" : ""} ${
              isSelected ? "is-selected" : ""
            }`}
            key={place.id}
            onClick={() => onSelectPlace(place.id)}
            style={{
              left: `${place.position.x}%`,
              top: `${place.position.y}%`,
              "--poi-accent": place.accent,
            } as React.CSSProperties}
            type="button"
          >
            <span className="map-poi-pin">{place.marker}</span>
            <span className="map-poi-label">
              <strong>{place.name}</strong>
              <small>{place.category}</small>
            </span>
          </button>
        );
      })}

      <div className="map-mode-switch" role="group" aria-label="地图模式">
        <button
          className={mapMode === "map" ? "is-active" : ""}
          onClick={() => changeMode("map")}
          type="button"
        >
          地图
        </button>
        <button
          className={mapMode === "satellite" ? "is-active" : ""}
          onClick={() => changeMode("satellite")}
          type="button"
        >
          卫星
        </button>
        <button
          className={mapMode === "traffic" ? "is-active" : ""}
          onClick={() => changeMode("traffic")}
          type="button"
        >
          <Layers3 size={14} />
          路况
        </button>
      </div>

      <div className="map-zoom">
        <button
          aria-label="放大"
          onClick={() => updateZoom(zoomLevel + 1)}
          type="button"
        >
          <Plus size={17} />
        </button>
        <button
          aria-label="缩小"
          onClick={() => updateZoom(zoomLevel - 1)}
          type="button"
        >
          <Minus size={17} />
        </button>
        <button
          aria-label="定位"
          onClick={() => {
            const firstPlace = activeRoute.placeIds[0];
            if (firstPlace) onSelectPlace(firstPlace);
            onNotify?.("已定位到当前路线起点");
          }}
          type="button"
        >
          <LocateFixed size={17} />
        </button>
      </div>

      <div className="map-route-status">
        <span className="route-status-icon">
          <Navigation2 size={16} />
        </span>
        <div>
          <strong>{activeRoute.name}</strong>
          <small>
            {realMapState === "ready"
              ? "高德底图已接入，路线在旁边安静同步"
              : realMapState === "loading"
                ? "正在加载高德底图"
                : "地图在旁边安静同步，不打断当前讨论"}
          </small>
        </div>
        <span className="source-badge">
          {realMapState === "ready" ? "高德地图" : `预览 ${zoomLevel}`}
        </span>
      </div>
    </section>
  );
}
