import { NextResponse } from "next/server";
import {
  getAmapClientReadiness,
  getAmapReadiness,
} from "@/lib/server/amap";

export async function GET() {
  const webService = getAmapReadiness();
  const jsApi = getAmapClientReadiness();

  return NextResponse.json({
    provider: "amap",
    ready: webService.ready && jsApi.ready,
    webService,
    jsApi,
    missing: [...webService.missing, ...jsApi.missing],
    capabilities: [
      "POI 搜索",
      "POI 详情",
      "地点图片字段",
      "天气",
      "驾车/步行路线",
    ],
  });
}
