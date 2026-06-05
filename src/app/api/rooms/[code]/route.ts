import { NextResponse } from "next/server";
import { getRoomSnapshot } from "@/lib/server/room-store";

type Context = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { code } = await context.params;
  const room = getRoomSnapshot(code, { createIfMissing: true });

  return NextResponse.json({ room });
}
