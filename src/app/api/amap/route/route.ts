import { NextResponse } from "next/server";
import { requestAmap } from "@/lib/server/amap";

type RouteMode = "driving" | "walking" | "bicycling" | "electrobike";

const modeToPath: Record<RouteMode, string> = {
  driving: "/v5/direction/driving",
  walking: "/v5/direction/walking",
  bicycling: "/v5/direction/bicycling",
  electrobike: "/v5/direction/electrobike",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const origin = typeof body.origin === "string" ? body.origin.trim() : "";
  const destination =
    typeof body.destination === "string" ? body.destination.trim() : "";
  const mode = (
    ["driving", "walking", "bicycling", "electrobike"].includes(body.mode)
      ? body.mode
      : "walking"
  ) as RouteMode;
  const waypoints = Array.isArray(body.waypoints)
    ? body.waypoints.filter((point: unknown) => typeof point === "string").join(";")
    : undefined;

  if (!origin || !destination) {
    return NextResponse.json(
      { error: "ORIGIN_AND_DESTINATION_REQUIRED" },
      { status: 400 },
    );
  }

  const result = await requestAmap(modeToPath[mode], {
    origin,
    destination,
    waypoints,
    show_fields: "cost,navi,polyline",
  });

  return NextResponse.json(result, {
    status: result.configured ? 200 : 501,
  });
}
