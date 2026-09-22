import type { LngLat } from "@/lib/obour-geofence";

export type LngLatPair = [number, number];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isLngLatPair(value: unknown): value is LngLatPair {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }
  const [lng, lat] = value;
  return (
    isFiniteNumber(lng) &&
    isFiniteNumber(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

/** Close ring if needed (first point === last). */
export function closePolygonRing(ring: LngLatPair[]): LngLatPair[] {
  if (ring.length === 0) {
    return ring;
  }
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, [first[0], first[1]]];
}

/**
 * Parse admin/API polygon payload.
 * - `null` clears the polygon
 * - array with ≥ 3 vertices is closed and stored
 */
export function parsePolygonRingInput(
  input: unknown,
):
  | { ok: true; ring: LngLatPair[] | null }
  | { ok: false; error: string } {
  if (input === null) {
    return { ok: true, ring: null };
  }

  if (!Array.isArray(input)) {
    return { ok: false, error: "شكل المضلع غير صالح." };
  }

  if (input.length === 0) {
    return { ok: true, ring: null };
  }

  const points: LngLatPair[] = [];
  for (const item of input) {
    if (!isLngLatPair(item)) {
      return { ok: false, error: "نقطة مضلع غير صالحة." };
    }
    points.push([item[0], item[1]]);
  }

  const uniqueCount =
    points.length >= 2 &&
    points[0]![0] === points[points.length - 1]![0] &&
    points[0]![1] === points[points.length - 1]![1]
      ? points.length - 1
      : points.length;

  if (uniqueCount < 3) {
    return {
      ok: false,
      error: "المضلع يحتاج 3 نقاط على الأقل.",
    };
  }

  return { ok: true, ring: closePolygonRing(points) };
}

export function serializePolygonRing(ring: LngLatPair[] | null): string | null {
  if (!ring || ring.length === 0) {
    return null;
  }
  return JSON.stringify(closePolygonRing(ring));
}

export function parseStoredPolygonRing(
  json: string | null | undefined,
): LngLatPair[] | null {
  if (!json) {
    return null;
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    const result = parsePolygonRingInput(parsed);
    if (!result.ok) {
      return null;
    }
    return result.ring;
  } catch {
    return null;
  }
}

export function ringToLngLat(ring: LngLatPair[]): LngLat[] {
  return ring.map(([lng, lat]) => [lng, lat] as const);
}
