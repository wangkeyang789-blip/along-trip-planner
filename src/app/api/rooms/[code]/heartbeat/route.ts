import { NextResponse } from "next/server";
import { heartbeatRoomMember } from "@/lib/server/room-store";

type Context = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: Context) {
  const { code } = await context.params;
  const body = await request.json().catch(() => ({}));

  if (typeof body.memberId !== "string") {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  const room = heartbeatRoomMember(code, {
    memberId: body.memberId,
    isMuted: typeof body.isMuted === "boolean" ? body.isMuted : undefined,
    isSpeaking: typeof body.isSpeaking === "boolean" ? body.isSpeaking : undefined,
    isOnline: typeof body.isOnline === "boolean" ? body.isOnline : undefined,
    transcript: typeof body.transcript === "string" ? body.transcript : undefined,
  });

  return NextResponse.json({ room });
}
