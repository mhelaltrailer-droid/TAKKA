import { isValidLatLng } from "@/lib/maps";

export const SERVICE_AREA_ID = "default";

export type ServiceAreaValues = {
  label: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  outOfAreaMessage: string;
};

/**
 * Seed only. Delivery checks read the ServiceArea row.
 * Center is the centroid of the مدينة العبور outline used by the district map.
 * 10 km covers that outline with about a kilometre of margin.
 */
export const SERVICE_AREA_DEFAULTS: ServiceAreaValues = {
  label: "مدينة العبور",
  centerLatitude: 30.226988,
  centerLongitude: 31.483791,
  radiusKm: 10,
  outOfAreaMessage:
    "موقع التوصيل خارج نطاق خدمة مدينة العبور. حرّك الدبوس داخل المدينة.",
};

const EARTH_RADIUS_KM = 6371.0088;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function distanceKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const dLat = toRadians(latitudeB - latitudeA);
  const dLng = toRadians(longitudeB - longitudeA);
  const lat1 = toRadians(latitudeA);
  const lat2 = toRadians(latitudeB);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function isInsideServiceArea(
  latitude: number,
  longitude: number,
  area: Pick<
    ServiceAreaValues,
    "centerLatitude" | "centerLongitude" | "radiusKm"
  >,
) {
  return (
    distanceKm(
      latitude,
      longitude,
      area.centerLatitude,
      area.centerLongitude,
    ) <= area.radiusKm
  );
}

function readNumber(
  raw: unknown,
  label: string,
  min: number,
  max: number,
): { ok: true; value: number } | { ok: false; error: string } {
  const value =
    typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isFinite(value) || value < min || value > max) {
    return {
      ok: false,
      error: `${label} لازم يكون بين ${min} و ${max}.`,
    };
  }
  return { ok: true, value };
}

export function parseServiceAreaInput(
  raw: Record<string, unknown>,
):
  | { ok: true; value: ServiceAreaValues }
  | { ok: false; error: string } {
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (label.length < 2 || label.length > 80) {
    return {
      ok: false,
      error: "اسم نطاق الخدمة لازم يكون بين 2 و 80 حرفًا.",
    };
  }

  const centerLatitude = readNumber(raw.centerLatitude, "خط العرض", -90, 90);
  if (!centerLatitude.ok) return centerLatitude;
  const centerLongitude = readNumber(
    raw.centerLongitude,
    "خط الطول",
    -180,
    180,
  );
  if (!centerLongitude.ok) return centerLongitude;
  const radiusKm = readNumber(
    raw.radiusKm,
    "نصف القطر بالكيلومتر",
    0.1,
    100,
  );
  if (!radiusKm.ok) return radiusKm;

  const message =
    typeof raw.outOfAreaMessage === "string"
      ? raw.outOfAreaMessage.trim()
      : "";
  if (message.length < 8 || message.length > 120) {
    return {
      ok: false,
      error: "رسالة خارج النطاق لازم تكون بين 8 و 120 حرفًا.",
    };
  }

  if (!isValidLatLng(centerLatitude.value, centerLongitude.value)) {
    return { ok: false, error: "إحداثيات مركز النطاق غير صالحة." };
  }

  return {
    ok: true,
    value: {
      label,
      centerLatitude: centerLatitude.value,
      centerLongitude: centerLongitude.value,
      radiusKm: radiusKm.value,
      outOfAreaMessage: message,
    },
  };
}
