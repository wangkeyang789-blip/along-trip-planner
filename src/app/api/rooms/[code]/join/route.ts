import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/server/room-store";

type Context = {
  params: Promise<{ code: string }>;
};

export async function POST(request: Request, context: Context) {
  const { code } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = joinRoom(code, {
      memberId: typeof body.memberId === "string" ? body.memberId : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      isHost: Boolean(body.isHost),
      isMuted: typeof body.isMuted === "boolean" ? body.isMuted : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "ROOM_FULL") {
      return NextResponse.json({ error: "ROOM_FULL" }, { status: 409 });
    }

    throw error;
  }
}
