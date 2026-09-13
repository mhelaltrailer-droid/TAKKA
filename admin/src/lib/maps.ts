/** Google Maps “share point” style URL for lat/lng. */
export function googleMapsShareUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function formatCoords(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function isValidLatLng(latitude: unknown, longitude: unknown) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Default map center: مدينة العبور */
export const OBOUR_MAP_CENTER = {
  latitude: 30.2285,
  longitude: 31.4697,
} as const;
