import { NextResponse } from "next/server";
import { updateRoomPlanning } from "@/lib/server/room-store";

type Context = {
  params: Promise<{ code: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { code } = await context.params;
  const body = await request.json().catch(() => ({}));

  const room = updateRoomPlanning(code, {
    activeRouteId: typeof body.activeRouteId === "string" ? body.activeRouteId : undefined,
    selectedPlaceId: typeof body.selectedPlaceId === "string" ? body.selectedPlaceId : undefined,
    selectedChoiceId:
      typeof body.selectedChoiceId === "string" || body.selectedChoiceId === null
        ? body.selectedChoiceId
        : undefined,
    updatedBy: typeof body.updatedBy === "string" ? body.updatedBy : null,
  });

  if (!room) {
    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ room });
}
