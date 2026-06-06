import { NextResponse } from "next/server";
import { updateRoomPlanning } from "@/lib/server/room-store";

type Context = {
  params: Promise<{ code: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { code } = await context.params;
  const body = await request.json().catch(() => ({}));
  const conversation =
    body.conversation && typeof body.conversation === "object"
      ? body.conversation
      : undefined;

  const room = updateRoomPlanning(code, {
    summary: typeof body.summary === "string" ? body.summary : undefined,
    routeDescription:
      typeof body.routeDescription === "string"
        ? body.routeDescription
        : undefined,
    waypoints: Array.isArray(body.waypoints) ? body.waypoints : undefined,
    routeVariants: Array.isArray(body.routeVariants)
      ? body.routeVariants
      : undefined,
    selectedVariantId:
      typeof body.selectedVariantId === "string"
        ? body.selectedVariantId
        : body.selectedVariantId === null
          ? null
          : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    summaryUpdatedAt:
      typeof body.summaryUpdatedAt === "number" ? body.summaryUpdatedAt : undefined,
    routeUpdatedAt:
      typeof body.routeUpdatedAt === "number" ? body.routeUpdatedAt : undefined,
    conversation: conversation
      ? {
          rollingSummary:
            typeof conversation.rollingSummary === "string"
              ? conversation.rollingSummary
              : conversation.rollingSummary === null
                ? null
                : undefined,
          recentTurns: Array.isArray(conversation.recentTurns)
            ? conversation.recentTurns
            : undefined,
          version:
            typeof conversation.version === "number"
              ? conversation.version
              : undefined,
          lastSpeechAt:
            typeof conversation.lastSpeechAt === "number"
              ? conversation.lastSpeechAt
              : conversation.lastSpeechAt === null
                ? null
                : undefined,
          compressedUntilVersion:
            typeof conversation.compressedUntilVersion === "number"
              ? conversation.compressedUntilVersion
              : undefined,
        }
      : undefined,
    updatedBy: typeof body.updatedBy === "string" ? body.updatedBy : null,
  });

  if (!room) {
    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ room });
}
