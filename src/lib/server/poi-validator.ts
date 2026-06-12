import type { PlanningWaypointSnapshot } from "@/lib/room-contracts";

function parseLocation(loc?: string): [number, number] | undefined {
  if (!loc) return undefined;
  const [lng, lat] = loc.split(",").map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : undefined;
}

export async function validateWaypoints(
  waypoints: PlanningWaypointSnapshot[],
  city: string
): Promise<PlanningWaypointSnapshot[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Check if Amap API is configured
  const statusRes = await fetch(`${baseUrl}/api/amap/status`).catch(() => null);
  const status = (await statusRes?.json().catch(() => ({}))) as { webService?: { ready?: boolean } };

  console.log("[POI Validator] AMap status:", status?.webService?.ready);

  if (!status?.webService?.ready) {
    return waypoints.map(wp => ({ ...wp, resolveStatus: "not_found" as const }));
  }

  const results = await Promise.all(
    waypoints.map(async (wp) => {
      if (wp.resolveStatus === "ready") return wp;

      // Step 1: Search by exact name
      const searchUrl = `${baseUrl}/api/amap/search?keywords=${encodeURIComponent(wp.name)}&region=${encodeURIComponent(city)}&page_size=5`;
      const res = await fetch(searchUrl).catch(() => null);
      const data = (await res?.json().catch(() => ({}))) as {
        configured?: boolean;
        data?: { pois?: Array<{ id?: string; name?: string; type?: string; address?: string | string[]; location?: string; photos?: Array<{ title?: string; url?: string }>; business?: { opentime_today?: string; opentime_week?: string; rating?: string; cost?: string } }> };
      };

      const pois = data?.data?.pois || [];

      // Exact match
      const exactMatch = pois.find(p => p.name === wp.name);
      if (exactMatch) {
        return {
          ...wp,
          resolveStatus: "ready" as const,
          address: Array.isArray(exactMatch.address) ? exactMatch.address.join("") : (exactMatch.address || undefined),
          location: parseLocation(exactMatch.location),
          category: exactMatch.type?.split(";")[0],
        };
      }

      // Step 2: First recommendation
      if (pois.length > 0) {
        const firstPoi = pois[0];
        const newName = firstPoi.name || wp.name;
        // Search again with the recommended name
        const confirmUrl = `${baseUrl}/api/amap/search?keywords=${encodeURIComponent(newName)}&region=${encodeURIComponent(city)}&page_size=1`;
        const confirmRes = await fetch(confirmUrl).catch(() => null);
        const confirmData = (await confirmRes?.json().catch(() => ({}))) as {
          data?: { pois?: Array<{ id?: string; name?: string; type?: string; address?: string | string[]; location?: string; photos?: Array<{ title?: string; url?: string }>; business?: { opentime_today?: string; opentime_week?: string; rating?: string; cost?: string } }> };
        };

        const confirmPoi = confirmData?.data?.pois?.[0];
        if (confirmPoi) {
          return {
            ...wp,
            name: newName,
            resolveStatus: "ready" as const,
            address: Array.isArray(confirmPoi.address) ? confirmPoi.address.join("") : (confirmPoi.address || undefined),
            location: parseLocation(confirmPoi.location),
            category: confirmPoi.type?.split(";")[0],
          };
        }
      }

      // Step 3: Not found
      return { ...wp, resolveStatus: "not_found" as const };
    })
  );

  console.log("[POI Validator] validated:", results.map(r => ({ name: r.name, status: r.resolveStatus })));
  return results;
}
