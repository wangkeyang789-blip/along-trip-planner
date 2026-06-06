// DEPRECATED: Intent parsing is now handled by the AI model via /api/ai/plan.
// This file remains as a no-op fallback for backward compatibility only.
export type ParsedIntent = {
  summary: string;
  routeIntent: string;
  suggestedChoiceId: string | null;
  activeRouteId: string | null;
  selectedPlaceId: string | null;
  city: string | null;
  preferenceUpdates: { id: string; weight: number }[];
  mapNote: string;
};

export function parseTranscript(_text: string): ParsedIntent | null {
  return null;
}
