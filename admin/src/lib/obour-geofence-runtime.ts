import type { LngLat, ObourDistrictPolygon } from "@/lib/obour-geofence";
import {
  OBOUR_CITY_RING,
  OBOUR_DISTRICT_POLYGONS,
} from "@/lib/obour-geofence";

export type DiscoveryDistrictsPayload = {
  cityName: string;
  cityRing: LngLat[];
  districts: Array<{
    id?: string;
    regionName: string;
    polygonRing: LngLat[] | null;
  }>;
};

let cachedPolygons: ObourDistrictPolygon[] | null = null;
let cachedCityRing: readonly LngLat[] | null = null;
let loadPromise: Promise<void> | null = null;

export function getRuntimeDistrictPolygons(): readonly ObourDistrictPolygon[] {
  return cachedPolygons ?? OBOUR_DISTRICT_POLYGONS;
}

export function getRuntimeCityRing(): readonly LngLat[] {
  return cachedCityRing ?? OBOUR_CITY_RING;
}

function applyPayload(payload: DiscoveryDistrictsPayload) {
  if (Array.isArray(payload.cityRing) && payload.cityRing.length >= 4) {
    cachedCityRing = payload.cityRing.map(
      ([lng, lat]) => [lng, lat] as const,
    );
  }

  const fromApi: ObourDistrictPolygon[] = [];
  for (const item of payload.districts ?? []) {
    const name = item.regionName?.trim();
    if (!name) continue;
    const ring = item.polygonRing;
    if (!ring || ring.length < 4) continue;
    fromApi.push({
      name,
      ring: ring.map(([lng, lat]) => [lng, lat] as const),
    });
  }

  if (fromApi.length > 0) {
    cachedPolygons = fromApi;
  }
}

/** Load district polygons from discovery API (falls back to code defaults). */
export async function ensureDistrictPolygonsLoaded(): Promise<void> {
  if (cachedPolygons) {
    return;
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch("/api/discovery/districts");
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as DiscoveryDistrictsPayload;
      applyPayload(payload);
    } catch {
      // Keep hardcoded defaults.
    } finally {
      loadPromise = null;
    }
  })();

  await loadPromise;
}
