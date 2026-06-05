import { NextResponse } from "next/server";
import { createRoom } from "@/lib/server/room-store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = createRoom({
    hostName: typeof body.hostName === "string" ? body.hostName : undefined,
    memberId: typeof body.memberId === "string" ? body.memberId : undefined,
    title: typeof body.title === "string" ? body.title : undefined,
  });

  return NextResponse.json(result);
}
