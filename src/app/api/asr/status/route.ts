import { NextResponse } from "next/server";
import { getDashScopeReadiness } from "@/lib/server/dashscope";

export async function GET() {
  const readiness = getDashScopeReadiness();

  return NextResponse.json({
    provider: "dashscope",
    ready: readiness.ready,
    missing: readiness.missing,
    recommendedModel: "paraformer-realtime-v2",
    websocketEndpoint: readiness.ready
      ? "wss://dashscope.aliyuncs.com/api-ws/v1/inference"
      : null,
    note: "Demo 当前只暴露 ASR 配置状态；实时音频流可在 TRTC 房间侧接入后转发到百炼 Paraformer。",
  });
}
