import { NextResponse } from "next/server";
import { requestAmap } from "@/lib/server/amap";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keywords = url.searchParams.get("keywords")?.trim();
  const region = url.searchParams.get("region")?.trim() || "北京";

  if (!keywords) {
    return NextResponse.json({ error: "KEYWORDS_REQUIRED" }, { status: 400 });
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
