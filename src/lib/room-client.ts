export type StoredRoomMember = {
  id: string;
  name: string;
};

export function normalizeRoomCode(code: string) {
  return decodeURIComponent(code).trim().toUpperCase();
}

export function getRoomMemberStorageKey(code: string) {
  return `along-member-${normalizeRoomCode(code)}`;
}

export function createLocalMemberId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `member-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function readStoredRoomMember(code: string): StoredRoomMember | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getRoomMemberStorageKey(code));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredRoomMember>;
    if (typeof parsed.id !== "string" || typeof parsed.name !== "string") {
      return null;
    }

    return { id: parsed.id, name: parsed.name };
  } catch {
    return null;
  }
}

export function saveStoredRoomMember(code: string, member: StoredRoomMember) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    getRoomMemberStorageKey(code),
    JSON.stringify(member),
  );
}
