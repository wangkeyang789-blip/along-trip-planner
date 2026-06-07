export type ConversationTurnSnapshot = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
};

export type TransportMode =
  | "walking"
  | "driving"
  | "transit"
  | "bicycling"
  ;

export type PlanningWaypointSnapshot = {
  id: string;
  name: string;
  description?: string;
  order: number;
  resolveStatus: "pending" | "searching" | "ready" | "not_found";
  recommendedTransport?: TransportMode;
  address?: string;
  location?: [number, number];
  category?: string;
};

export type RouteSegmentSnapshot = {
  id: string;
  fromWaypointId: string;
  toWaypointId: string;
  mode: TransportMode;
  modeLabel: string;
  distanceText: string | null;
  durationText: string | null;
  costText: string | null;
  polyline?: [number, number][];
  status: "pending" | "ready" | "failed";
};

export type RouteVariantSnapshot = {
  id: string;
  name: string;
  label: string;
  description: string;
  theme: string;
  waypoints: PlanningWaypointSnapshot[];
  segments: RouteSegmentSnapshot[];
  totalDistanceText: string | null;
  totalDurationText: string | null;
  totalCostText: string | null;
  transportSummary: string | null;
  routeStatus: "pending" | "ready" | "partial" | "failed";
};

export type PlanningSnapshot = {
  summary: string | null;
  routeDescription: string | null;
  waypoints: PlanningWaypointSnapshot[];
  routeVariants: RouteVariantSnapshot[];
  selectedVariantId: string | null;
  city: string;
  summaryUpdatedAt: number | null;
  routeUpdatedAt: number | null;
  updatedAt: number;
  updatedBy: string | null;
};
