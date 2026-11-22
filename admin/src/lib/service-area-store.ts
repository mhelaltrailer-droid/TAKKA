import { db } from "@/lib/db";
import { isValidLatLng } from "@/lib/maps";
import {
  SERVICE_AREA_DEFAULTS,
  SERVICE_AREA_ID,
  isInsideServiceArea,
  parseServiceAreaInput,
  type ServiceAreaValues,
} from "@/lib/service-area";

const CACHE_MS = 15_000;

let cached: { value: ServiceAreaValues; expiresAt: number } | null = null;

export function clearServiceAreaCache() {
  cached = null;
}

function fromRow(row: {
  label: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  outOfAreaMessage: string;
}): ServiceAreaValues {
  return {
    label: row.label,
    centerLatitude: row.centerLatitude,
    centerLongitude: row.centerLongitude,
    radiusKm: row.radiusKm,
    outOfAreaMessage: row.outOfAreaMessage,
  };
}

export async function getServiceArea(): Promise<ServiceAreaValues> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existing = await db.serviceArea.findUnique({
    where: { id: SERVICE_AREA_ID },
  });

  let row = existing;
  if (!row) {
    try {
      row = await db.serviceArea.create({
        data: {
          id: SERVICE_AREA_ID,
          ...SERVICE_AREA_DEFAULTS,
        },
      });
    } catch {
      row = await db.serviceArea.findUnique({
        where: { id: SERVICE_AREA_ID },
      });
    }
  }

  if (!row) {
    throw new Error("Service area is unavailable.");
  }

  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

export async function saveServiceArea(
  raw: Record<string, unknown>,
): Promise<
  { ok: true; value: ServiceAreaValues } | { ok: false; error: string }
> {
  const parsed = parseServiceAreaInput(raw);
  if (!parsed.ok) {
    return parsed;
  }

  const row = await db.serviceArea.upsert({
    where: { id: SERVICE_AREA_ID },
    create: {
      id: SERVICE_AREA_ID,
      ...parsed.value,
    },
    update: parsed.value,
  });
  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return { ok: true, value };
}

/**
 * Null when the point is inside the saved area.
 * Invalid coordinates get a fixed validation message; the out-of-area
 * sentence comes from the admin setting.
 */
export async function outsideServiceAreaMessage(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  if (!isValidLatLng(latitude, longitude)) {
    return "إحداثيات الموقع غير صالحة.";
  }

  const area = await getServiceArea();
  if (isInsideServiceArea(latitude, longitude, area)) {
    return null;
  }
  return area.outOfAreaMessage;
}

/** Both coordinates absent is fine. A partial or out-of-area pair is rejected. */
export async function storedCoordinatesError(
  latitude: number | null,
  longitude: number | null,
): Promise<string | null> {
  if (latitude == null && longitude == null) {
    return null;
  }
  if (
    latitude == null ||
    longitude == null ||
    !isValidLatLng(latitude, longitude)
  ) {
    return "إحداثيات الموقع غير صالحة.";
  }
  return outsideServiceAreaMessage(latitude, longitude);
}
