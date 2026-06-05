import { NextResponse } from "next/server";
import {
  createTrtcUserSig,
  getTrtcReadiness,
} from "@/lib/server/trtc";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const expireSeconds =
    typeof body.expireSeconds === "number" ? body.expireSeconds : undefined;

  if (!userId) {
    return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
  }

  const readiness = getTrtcReadiness();
  if (!readiness.ready) {
    return NextResponse.json(
      {
        ready: false,
        provider: "trtc",
        missing: readiness.missing,
        note: "配置 TRTC_SDK_APP_ID 与 TRTC_SECRET_KEY 后即可签发 UserSig。",
      },
      { status: 501 },
    );
  }

  const result = createTrtcUserSig({ userId, expireSeconds });

  return NextResponse.json({
    ready: true,
    provider: "trtc",
    userId,
    ...result,
  });
}
