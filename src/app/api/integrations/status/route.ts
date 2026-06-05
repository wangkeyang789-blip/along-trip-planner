import { NextResponse } from "next/server";
import {
  getAmapClientReadiness,
  getAmapReadiness,
} from "@/lib/server/amap";
import { getDashScopeReadiness } from "@/lib/server/dashscope";
import { getTrtcReadiness } from "@/lib/server/trtc";

export async function GET() {
  const amapWebService = getAmapReadiness();
  const amapJsApi = getAmapClientReadiness();
  const trtc = getTrtcReadiness();
  const dashscope = getDashScopeReadiness();

  return NextResponse.json({
    ready:
      amapWebService.ready &&
      amapJsApi.ready &&
      trtc.ready &&
      dashscope.ready,
    integrations: {
      amap: {
        ready: amapWebService.ready && amapJsApi.ready,
        webService: amapWebService,
        jsApi: amapJsApi,
      },
      trtc,
      dashscope,
    },
  });
}
