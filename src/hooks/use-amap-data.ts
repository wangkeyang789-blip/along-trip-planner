"use client";

import { useEffect, useMemo, useState } from "react";
import type { Place, RouteStats, RouteVariant } from "@/lib/types";
import { demoPlaces } from "@/lib/demo-data";

type AmapSearchPoi = {
  id?: string;
  name?: string;
  type?: string;
  typecode?: string;
  address?: string | string[];
  location?: string;
  pname?: string;
  cityname?: string;
  adname?: string;
  photos?: Array<{ title?: string; url?: string }>;
  business?: {
    rating?: string;
    opentime_today?: string;
    opentime_week?: string;
    cost?: string;
  };
  biz_ext?: {
    rating?: string;
    cost?: string;
  };
};

type AmapWeatherLive = {
  weather?: string;
  temperature?: string;
  winddirection?: string;
  windpower?: string;
};

type AmapEnvelope<T> =
  | {
      configured: true;
      source: "amap";
      ok: boolean;
      data: T;
    }
  | {
      configured: false;
      source: "amap";
      missing: string[];
      note: string;
    };

type UseAmapDataResult = {
  places: Place[];
  weatherText: string;
  routeStats: RouteStats;
  isConfigured: boolean;
  isLoading: boolean;
};

const emptyRouteStats: RouteStats = {
  distanceText: null,
  durationText: null,
  congestionText: null,
  sourceStatus: "pending",
};

function parseLocation(location?: string): [number, number] | undefined {
  const [lng, lat] = (location || "").split(",").map(Number);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
  return [lng, lat];
}

function formatMeters(meters?: string | number) {
  const value = Number(meters);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.round(value)} m`;
}

function formatSeconds(seconds?: string | number) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  const minutes = Math.round(value / 60);
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

function extractPoi(data: unknown): AmapSearchPoi | null {
  const envelope = data as { pois?: AmapSearchPoi[]; status?: string };
  return envelope.pois?.[0] || null;
}

function mergePoi(place: Place, poi: AmapSearchPoi | null): Place {
  if (!poi) return place;

  const photoUrl = poi.photos?.find((photo) => photo.url)?.url;
  const location = parseLocation(poi.location);
  const businessHours =
    poi.business?.opentime_today || poi.business?.opentime_week || undefined;
  const rating = poi.business?.rating || poi.biz_ext?.rating || undefined;
  const cost = poi.business?.cost || poi.biz_ext?.cost || undefined;
  const address = Array.isArray(poi.address) ? poi.address.join("") : poi.address;

  return {
    ...place,
    amapId: poi.id,
    address: address || place.address,
    area: poi.adname || place.area,
    category: poi.type?.split(";")[0] || place.category,
    description: address
      ? `${address}。更多介绍、图片和营业信息以高德实际返回为准。`
      : "高德已返回地点基础信息，缺失字段将保持空白。",
    location,
    photoUrl,
    businessHours,
    rating,
    cost,
    sourceStatus: "ready",
  };
}

function extractWeatherText(data: unknown) {
  const lives = (data as { lives?: AmapWeatherLive[] }).lives;
  const live = lives?.[0];
  if (!live) return "高德天气待配置";

  const temperature = live.temperature ? `${live.temperature}℃` : "";
  const wind = live.winddirection ? `${live.winddirection}风` : "";

  return [live.weather, temperature, wind].filter(Boolean).join(" · ");
}

function extractRouteStats(data: unknown): RouteStats {
  const route = data as {
    route?: {
      paths?: Array<{
        distance?: string;
        duration?: string;
        restriction?: string;
      }>;
    };
  };
  const path = route.route?.paths?.[0];
  if (!path) return emptyRouteStats;

  return {
    distanceText: formatMeters(path.distance),
    durationText: formatSeconds(path.duration),
    congestionText: "高德路线已返回",
    sourceStatus: "ready",
  };
}

export function useAmapData(activeRoute: RouteVariant): UseAmapDataResult {
  const [places, setPlaces] = useState<Place[]>(demoPlaces);
  const [weatherText, setWeatherText] = useState("高德天气待配置");
  const [routeStats, setRouteStats] = useState<RouteStats>(emptyRouteStats);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadAmapData() {
      setIsLoading(true);

      try {
        const statusResponse = await fetch("/api/amap/status", {
          cache: "no-store",
        });
        const status = (await statusResponse.json()) as {
          webService?: { ready?: boolean };
        };
        if (!status.webService?.ready) {
          if (!cancelled) {
            setIsConfigured(false);
            setPlaces(demoPlaces);
            setWeatherText("高德天气待配置");
            setRouteStats(emptyRouteStats);
          }
          return;
        }

        const poiResults = await Promise.all(
          demoPlaces.map(async (place) => {
            const response = await fetch(
              `/api/amap/search?keywords=${encodeURIComponent(
                place.name,
              )}&region=${encodeURIComponent("北京")}&page_size=1`,
              { cache: "no-store" },
            );
            const result = (await response.json()) as AmapEnvelope<unknown>;
            if (!("configured" in result) || !result.configured) return place;
            return mergePoi(place, extractPoi(result.data));
          }),
        );

        const weatherResponse = await fetch("/api/amap/weather?city=北京", {
          cache: "no-store",
        });
        const weatherResult =
          (await weatherResponse.json()) as AmapEnvelope<unknown>;

        const routePlaces = activeRoute.placeIds
          .map((placeId) => poiResults.find((place) => place.id === placeId))
          .filter((place): place is Place => Boolean(place?.location));
        let nextRouteStats = emptyRouteStats;

        if (routePlaces.length >= 2) {
          const [origin] = routePlaces;
          const destination = routePlaces[routePlaces.length - 1];
          const waypoints = routePlaces
            .slice(1, -1)
            .map((place) => place.location?.join(","));
          const routeResponse = await fetch("/api/amap/route", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "driving",
              origin: origin.location?.join(","),
              destination: destination.location?.join(","),
              waypoints,
            }),
          });
          const routeResult =
            (await routeResponse.json()) as AmapEnvelope<unknown>;
          if ("configured" in routeResult && routeResult.configured) {
            nextRouteStats = extractRouteStats(routeResult.data);
          }
        }

        if (!cancelled) {
          setIsConfigured(true);
          setPlaces(poiResults);
          setWeatherText(
            "configured" in weatherResult && weatherResult.configured
              ? extractWeatherText(weatherResult.data)
              : "高德天气待配置",
          );
          setRouteStats(nextRouteStats);
        }
      } catch {
        if (!cancelled) {
          setIsConfigured(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAmapData();

    return () => {
      cancelled = true;
    };
  }, [activeRoute]);

  return useMemo(
    () => ({
      places,
      weatherText,
      routeStats,
      isConfigured,
      isLoading,
    }),
    [isConfigured, isLoading, places, routeStats, weatherText],
  );
}
