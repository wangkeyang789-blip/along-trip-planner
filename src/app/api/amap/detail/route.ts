import { NextResponse } from "next/server";
import { requestAmap } from "@/lib/server/amap";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();

  if (!id) {
    return NextResponse.json({ error: "POI_ID_REQUIRED" }, { status: 400 });
  }

  const result = await requestAmap("/v5/place/detail", {
    id,
    show_fields: "business,photos,navi,children",
  });

  return NextResponse.json(result, {
    status: result.configured ? 200 : 501,
  });
}
