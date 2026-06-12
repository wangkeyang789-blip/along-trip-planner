import { NextResponse } from "next/server";
import { requestAmap } from "@/lib/server/amap";
import { searchZhuhaiPois } from "@/lib/server/zhuhai-poi";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keywords = url.searchParams.get("keywords")?.trim();
  const region = url.searchParams.get("region")?.trim() || "北京";

  if (!keywords) {
    return NextResponse.json({ error: "KEYWORDS_REQUIRED" }, { status: 400 });
  }

  // 珠海本地 POI 快速返回 —— 零延迟，模拟 API 响应
  const isZhuhai = region.includes("珠海") || region.toLowerCase().includes("zhuhai");
  if (isZhuhai) {
    const matches = searchZhuhaiPois(keywords, 5);
    if (matches.length > 0) {
      return NextResponse.json({
        configured: true,
        source: "local-zhuhai",
        data: {
          pois: matches.map((poi) => ({
            id: poi.id,
            name: poi.name,
            type: poi.type,
            address: poi.address,
            location: poi.location,
            adname: poi.adname,
            photos: poi.photos,
            business: poi.business,
          })),
        },
      });
    }
    // 本地未命中，降级到高德 API
  }

  const result = await requestAmap("/v5/place/text", {
    keywords,
    region,
    city_limit: "true",
    page_size: url.searchParams.get("page_size") || "10",
    page_num: url.searchParams.get("page_num") || "1",
    show_fields: "business,photos,navi",
  });

  return NextResponse.json(result, {
    status: result.configured ? 200 : 501,
  });
}
