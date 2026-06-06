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


// Dynamic waypoint from AI planning
export type Waypoint = {
  id: string;          // unique id from AI (e.g. "poi-0", "poi-1")
  name: string;        // place name in Chinese
  description?: string; // why this place was chosen (from AI)
  order: number;       // visit order
  resolveStatus: "pending" | "searching" | "ready" | "not_found";
  // Filled after Amap POI search:
  amapId?: string;
  address?: string;
  location?: [number, number];
  category?: string;
  photoUrl?: string;
  rating?: string;     // rating from Amap (e.g. "4.9")
  businessHours?: string; // opening hours from Amap
  cost?: string;       // average cost
  photos?: Array<{ title?: string; url: string }>; // photo gallery from Amap
};

// AI planner output
export type AiPlanOutput = {
  summary: string;         // overall summary of team discussion
  routeDescription: string; // description of the route
  waypoints: Waypoint[];   // ordered list of places
  mapUpdates: {
    center?: [number, number]; // map center [lng, lat]
    zoom?: number;
  };
};
