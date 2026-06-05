import { NextResponse } from "next/server";
import { requestAmap } from "@/lib/server/amap";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city")?.trim() || "北京";

  const result = await requestAmap("/v3/weather/weatherInfo", {
    city,
    extensions: url.searchParams.get("extensions") || "base",
  });

  return NextResponse.json(result, {
    status: result.configured ? 200 : 501,
  });
}
