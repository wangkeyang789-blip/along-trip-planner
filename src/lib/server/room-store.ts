import type {
  JoinRoomResponse,
  PlanningSnapshot,
  RoomMemberSnapshot,
  RoomSnapshot,
  RoomStatePatch,
} from "@/lib/room-contracts";
import { getTrtcReadiness } from "@/lib/server/trtc";

type RoomRecord = {
  code: string;
  title: string;
  createdAt: number;
  expiresAt: number;
  participantLimit: number;
  version: number;
  members: Map<string, RoomMemberSnapshot>;
  planning: PlanningSnapshot;
};

type RoomStoreGlobal = {
  rooms: Map<string, RoomRecord>;
};

const ROOM_TTL_MS = 24 * 60 * 60 * 1000;
const STALE_MEMBER_MS = 30 * 1000;
const DEFAULT_PARTICIPANT_LIMIT = Number(process.env.MAX_ROOM_PARTICIPANTS || 10);

const colors = [
  "#75a7e8",
  "#ee9476",
  "#76baaa",
  "#8d83e9",
  "#e5ac3b",
  "#91b97a",
  "#d78eb4",
  "#7eb8c8",
];

declare global {
  // eslint-disable-next-line no-var
  var __alongRoomStore: RoomStoreGlobal | undefined;
}

function getStore(): RoomStoreGlobal {
  if (!globalThis.__alongRoomStore) {
    globalThis.__alongRoomStore = {
      rooms: new Map(),
    };
  }

  return globalThis.__alongRoomStore;
}

function now() {
  return Date.now();
}

function normalizeCode(code: string) {
  return decodeURIComponent(code).trim().toUpperCase();
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return `ALONG-${suffix}`;
}

function makeInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "旅";
  const asciiWords = trimmed.match(/[A-Za-z0-9]+/g);
  if (asciiWords && asciiWords.length > 0) {
    return asciiWords
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("");
  }

  return Array.from(trimmed).slice(0, 2).join("");
}

function createPlanningState(): PlanningSnapshot {
  return {
    activeRouteId: "balanced",
    selectedPlaceId: "forbidden-city",
    selectedChoiceId: null,
    updatedAt: now(),
    updatedBy: null,
  };
}

function toSnapshot(room: RoomRecord): RoomSnapshot {
  const timestamp = now();
  const members = Array.from(room.members.values())
    .map((member) => ({
      ...member,
      isOnline: member.isOnline && timestamp - member.lastSeenAt < STALE_MEMBER_MS,
    }))
    .sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.joinedAt - b.joinedAt);

  return {
    code: room.code,
    title: room.title,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    participantLimit: room.participantLimit,
    version: room.version,
    members,
    planning: room.planning,
    trtc: getTrtcReadiness(),
  };
}

function cleanupRooms() {
  const store = getStore();
  const timestamp = now();

  for (const [code, room] of store.rooms.entries()) {
    const hasOnlineMembers = Array.from(room.members.values()).some(
      (member) => member.isOnline && timestamp - member.lastSeenAt < STALE_MEMBER_MS,
    );

    if (timestamp > room.expiresAt || (!hasOnlineMembers && timestamp - room.createdAt > 10 * 60 * 1000)) {
      store.rooms.delete(code);
    }
  }
}

function createRoomRecord(code: string, title = "北京周末同行"): RoomRecord {
  const timestamp = now();
  return {
    code,
    title,
    createdAt: timestamp,
    expiresAt: timestamp + ROOM_TTL_MS,
    participantLimit: DEFAULT_PARTICIPANT_LIMIT,
    version: 1,
    members: new Map(),
    planning: createPlanningState(),
  };
}

export function createRoom(input?: { title?: string; hostName?: string; memberId?: string }): JoinRoomResponse {
  cleanupRooms();

  const store = getStore();
  let code = makeCode();

  while (store.rooms.has(code)) {
    code = makeCode();
  }

  const room = createRoomRecord(code, input?.title);
  store.rooms.set(code, room);

  return joinRoom(code, {
    memberId: input?.memberId,
    name: input?.hostName || "林澈",
    isHost: true,
  });
}

export function getRoomSnapshot(code: string, options?: { createIfMissing?: boolean }): RoomSnapshot | null {
  cleanupRooms();

  const normalizedCode = normalizeCode(code);
  const store = getStore();
  let room = store.rooms.get(normalizedCode);

  if (!room && options?.createIfMissing) {
    room = createRoomRecord(normalizedCode);
    store.rooms.set(normalizedCode, room);
  }

  return room ? toSnapshot(room) : null;
}

export function joinRoom(
  code: string,
  input: {
    memberId?: string;
    name?: string;
    isHost?: boolean;
    isMuted?: boolean;
  },
): JoinRoomResponse {
  cleanupRooms();

  const normalizedCode = normalizeCode(code);
  const store = getStore();
  let room = store.rooms.get(normalizedCode);

  if (!room) {
    room = createRoomRecord(normalizedCode);
    store.rooms.set(normalizedCode, room);
  }

  const timestamp = now();
  const memberId = input.memberId || crypto.randomUUID();
  const existing = room.members.get(memberId);
  const onlineCount = Array.from(room.members.values()).filter(
    (member) => member.isOnline && timestamp - member.lastSeenAt < STALE_MEMBER_MS,
  ).length;

  if (!existing && onlineCount >= room.participantLimit) {
    throw new Error("ROOM_FULL");
  }

  const name = input.name?.trim() || existing?.name || "同行者";
  const member: RoomMemberSnapshot = {
    id: memberId,
    name,
    initials: makeInitials(name),
    color: existing?.color || colors[room.members.size % colors.length],
    isHost: input.isHost || existing?.isHost || room.members.size === 0,
    isOnline: true,
    isMuted: input.isMuted ?? existing?.isMuted ?? false,
    isSpeaking: false,
    joinedAt: existing?.joinedAt || timestamp,
    lastSeenAt: timestamp,
  };

  room.members.set(memberId, member);
  room.version += 1;

  return {
    room: toSnapshot(room),
    member,
  };
}

export function heartbeatRoomMember(
  code: string,
  input: {
    memberId: string;
    isMuted?: boolean;
    isSpeaking?: boolean;
    isOnline?: boolean;
  },
): RoomSnapshot | null {
  const normalizedCode = normalizeCode(code);
  const room = getStore().rooms.get(normalizedCode);
  if (!room) return null;

  const member = room.members.get(input.memberId);
  if (!member) return null;

  room.members.set(input.memberId, {
    ...member,
    isMuted: input.isMuted ?? member.isMuted,
    isSpeaking: input.isSpeaking ?? member.isSpeaking,
    isOnline: input.isOnline ?? true,
    lastSeenAt: now(),
  });
  room.version += 1;

  return toSnapshot(room);
}

export function updateRoomPlanning(code: string, patch: RoomStatePatch): RoomSnapshot | null {
  const normalizedCode = normalizeCode(code);
  const room = getStore().rooms.get(normalizedCode);
  if (!room) return null;
  const cleanPatch = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as RoomStatePatch;

  room.planning = {
    ...room.planning,
    ...cleanPatch,
    updatedAt: now(),
    updatedBy: cleanPatch.updatedBy ?? room.planning.updatedBy,
  };
  room.version += 1;

  return toSnapshot(room);
}
