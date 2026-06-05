export type RoomMemberSnapshot = {
  id: string;
  name: string;
  initials: string;
  color: string;
  isHost: boolean;
  isOnline: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
  lastSeenAt: number;
};

export type PlanningSnapshot = {
  activeRouteId: string;
  selectedPlaceId: string;
  selectedChoiceId: string | null;
  updatedAt: number;
  updatedBy: string | null;
};

export type TrtcReadiness = {
  ready: boolean;
  sdkAppId: string | null;
  missing: string[];
};

export type RoomSnapshot = {
  code: string;
  title: string;
  createdAt: number;
  expiresAt: number;
  participantLimit: number;
  version: number;
  members: RoomMemberSnapshot[];
  planning: PlanningSnapshot;
  trtc: TrtcReadiness;
};

export type JoinRoomResponse = {
  room: RoomSnapshot;
  member: RoomMemberSnapshot;
};

export type RoomStatePatch = Partial<
  Pick<PlanningSnapshot, "activeRouteId" | "selectedPlaceId" | "selectedChoiceId">
> & {
  updatedBy?: string | null;
};
