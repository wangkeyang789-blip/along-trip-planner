export type Member = {
  id: string;
  name: string;
  initials: string;
  color: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
};

export type Place = {
  id: string;
  name: string;
  category: string;
  area: string;
  marker: string;
  accent: string;
  position: {
    x: number;
    y: number;
  };
  description: string;
  sourceStatus: "pending" | "ready";
  amapId?: string;
  address?: string;
  location?: [number, number];
  photoUrl?: string;
  businessHours?: string;
  rating?: string;
  cost?: string;
  sourceUrl?: string;
};

export type RouteStats = {
  distanceText: string | null;
  durationText: string | null;
  congestionText: string | null;
  sourceStatus: "pending" | "ready";
};

export type RouteVariant = {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  placeIds: string[];
};

export type Preference = {
  id: string;
  label: string;
  weight: number;
};

export type ChoiceOption = {
  id: string;
  label: string;
  description: string;
  icon: string;
};
