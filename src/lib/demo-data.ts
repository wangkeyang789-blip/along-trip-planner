import type { Member } from "@/lib/types";

// Minimal fallback member data – only used when room hasn't synced yet
export const demoMembers: Member[] = [
  { id: "m1", name: "你", initials: "你", color: "#7167f6", isSpeaking: false },
  { id: "m2", name: "同行者", initials: "T", color: "#ff8c65" },
];
