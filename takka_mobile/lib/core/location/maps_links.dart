String googleMapsShareUrl(double latitude, double longitude) {
  return 'https://www.google.com/maps?q=$latitude,$longitude';
}

String formatCoords(double latitude, double longitude) {
  return '${latitude.toStringAsFixed(6)}, ${longitude.toStringAsFixed(6)}';
}

/// Default map center: مدينة العبور
const obourMapCenterLat = 30.2285;
const obourMapCenterLng = 31.4697;
