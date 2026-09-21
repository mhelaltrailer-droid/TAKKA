/// GeoJSON rings: [longitude, latitude] — closed (first == last).

typedef LngLat = ({double lng, double lat});

class ObourDistrictPolygon {
  const ObourDistrictPolygon({required this.name, required this.ring});

  final String name;
  final List<LngLat> ring;
}

/// حدود خدمة مدينة العبور (تقريبية من رسم يدوي).
const List<LngLat> obourCityRing = [
  (lng: 31.5598667, lat: 30.1798986),
  (lng: 31.5368827, lat: 30.2798196),
  (lng: 31.4774786, lat: 30.2860646),
  (lng: 31.4562997, lat: 30.2597437),
  (lng: 31.4379503, lat: 30.2310343),
  (lng: 31.4380966, lat: 30.1873019),
  (lng: 31.4799655, lat: 30.1650537),
  (lng: 31.5598667, lat: 30.1798986),
];

/// مضلعات الأحياء — عند التداخل يُختار الأصغر مساحة.
const List<ObourDistrictPolygon> obourDistrictPolygons = [
  ObourDistrictPolygon(
    name: 'الحي الأول',
    ring: [
      (lng: 31.4583687, lat: 30.2256611),
      (lng: 31.4871081, lat: 30.2342722),
      (lng: 31.4815712, lat: 30.2414704),
      (lng: 31.4587906, lat: 30.241926),
      (lng: 31.4583687, lat: 30.2256611),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي الثاني',
    ring: [
      (lng: 31.4814875, lat: 30.2424232),
      (lng: 31.4894502, lat: 30.2454754),
      (lng: 31.4909795, lat: 30.2534471),
      (lng: 31.4749487, lat: 30.2556335),
      (lng: 31.4678825, lat: 30.2486186),
      (lng: 31.4626619, lat: 30.2415576),
      (lng: 31.4814875, lat: 30.2424232),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي الثالث',
    ring: [
      (lng: 31.5011178, lat: 30.2573186),
      (lng: 31.5056208, lat: 30.2492212),
      (lng: 31.5048665, lat: 30.2450939),
      (lng: 31.480056, lat: 30.2369837),
      (lng: 31.4819839, lat: 30.2418354),
      (lng: 31.4908687, lat: 30.2532758),
      (lng: 31.5011178, lat: 30.2573186),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي الرابع',
    ring: [
      (lng: 31.5039038, lat: 30.2505213),
      (lng: 31.4991039, lat: 30.2451553),
      (lng: 31.4994804, lat: 30.2445049),
      (lng: 31.4970334, lat: 30.2410088),
      (lng: 31.4894101, lat: 30.2410088),
      (lng: 31.4858337, lat: 30.2371873),
      (lng: 31.4847985, lat: 30.2253966),
      (lng: 31.4921394, lat: 30.2205986),
      (lng: 31.4937394, lat: 30.2337722),
      (lng: 31.5072919, lat: 30.2472692),
      (lng: 31.5039038, lat: 30.2505213),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي الخامس',
    ring: [
      (lng: 31.484447, lat: 30.22997),
      (lng: 31.4830645, lat: 30.2129159),
      (lng: 31.4711463, lat: 30.2161704),
      (lng: 31.4597525, lat: 30.2235853),
      (lng: 31.4627559, lat: 30.2280752),
      (lng: 31.4699545, lat: 30.22997),
      (lng: 31.484447, lat: 30.22997),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي السادس',
    ring: [
      (lng: 31.4592889, lat: 30.223299),
      (lng: 31.473293, lat: 30.211821),
      (lng: 31.4707687, lat: 30.1996663),
      (lng: 31.4595293, lat: 30.1976924),
      (lng: 31.4576661, lat: 30.2016403),
      (lng: 31.4583272, lat: 30.2105744),
      (lng: 31.458207, lat: 30.2203907),
      (lng: 31.4592889, lat: 30.223299),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي السابع',
    ring: [
      (lng: 31.4600113, lat: 30.1979446),
      (lng: 31.4703064, lat: 30.1980181),
      (lng: 31.4746457, lat: 30.200886),
      (lng: 31.4845154, lat: 30.1964003),
      (lng: 31.4833242, lat: 30.1874282),
      (lng: 31.4701362, lat: 30.1850747),
      (lng: 31.4600113, lat: 30.1979446),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي الثامن',
    ring: [
      (lng: 31.4894501, lat: 30.2686575),
      (lng: 31.4860066, lat: 30.2660581),
      (lng: 31.4843797, lat: 30.26566),
      (lng: 31.4865489, lat: 30.2596881),
      (lng: 31.4935986, lat: 30.2558706),
      (lng: 31.5009465, lat: 30.2575568),
      (lng: 31.5002416, lat: 30.2607185),
      (lng: 31.4894501, lat: 30.2686575),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي التاسع',
    ring: [
      (lng: 31.4417098, lat: 30.2300144),
      (lng: 31.4564568, lat: 30.2244275),
      (lng: 31.4560031, lat: 30.2086127),
      (lng: 31.4377773, lat: 30.2091029),
      (lng: 31.4381554, lat: 30.2280541),
      (lng: 31.4417098, lat: 30.2300144),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحي الترفيهي',
    ring: [
      (lng: 31.4517452, lat: 30.2300178),
      (lng: 31.4542177, lat: 30.2318168),
      (lng: 31.4587462, lat: 30.2433066),
      (lng: 31.457601, lat: 30.2473985),
      (lng: 31.4517973, lat: 30.2484777),
      (lng: 31.4433128, lat: 30.2390796),
      (lng: 31.4499234, lat: 30.2348299),
      (lng: 31.4517452, lat: 30.2300178),
    ],
  ),
  ObourDistrictPolygon(
    name: 'دار مصر',
    ring: [
      (lng: 31.4481952, lat: 30.2279158),
      (lng: 31.4386193, lat: 30.2332281),
      (lng: 31.4427811, lat: 30.2390357),
      (lng: 31.4499373, lat: 30.2348047),
      (lng: 31.4501442, lat: 30.2316612),
      (lng: 31.4481952, lat: 30.2279158),
    ],
  ),
  ObourDistrictPolygon(
    name: 'جولف سيتي',
    ring: [
      (lng: 31.4761732, lat: 30.1710346),
      (lng: 31.4704525, lat: 30.1845933),
      (lng: 31.4893309, lat: 30.1884256),
      (lng: 31.4875193, lat: 30.1731366),
      (lng: 31.4761732, lat: 30.1710346),
    ],
  ),
  ObourDistrictPolygon(
    name: 'إسكان الشباب / المستقبل',
    ring: [
      (lng: 31.4581478, lat: 30.2492648),
      (lng: 31.4596833, lat: 30.2446333),
      (lng: 31.4647584, lat: 30.2458699),
      (lng: 31.4750646, lat: 30.2560767),
      (lng: 31.489765, lat: 30.268815),
      (lng: 31.4846968, lat: 30.2728964),
      (lng: 31.4674719, lat: 30.2580784),
      (lng: 31.4581478, lat: 30.2492648),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الإسكان العائلي / القومي',
    ring: [
      (lng: 31.503179, lat: 30.2526419),
      (lng: 31.5074564, lat: 30.2569157),
      (lng: 31.4889424, lat: 30.2714728),
      (lng: 31.4876655, lat: 30.2703701),
      (lng: 31.500753, lat: 30.2602244),
      (lng: 31.5018064, lat: 30.2531383),
      (lng: 31.503179, lat: 30.2526419),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الحرية / المجد',
    ring: [
      (lng: 31.4985325, lat: 30.2764902),
      (lng: 31.4976121, lat: 30.273825),
      (lng: 31.513187, lat: 30.2695387),
      (lng: 31.5366303, lat: 30.2785319),
      (lng: 31.5354031, lat: 30.2802307),
      (lng: 31.4985325, lat: 30.2764902),
    ],
  ),
  ObourDistrictPolygon(
    name: 'الكرامة / سكن مصر',
    ring: [
      (lng: 31.5134066, lat: 30.2698194),
      (lng: 31.5148043, lat: 30.2591707),
      (lng: 31.5365235, lat: 30.2635666),
      (lng: 31.5362368, lat: 30.277279),
      (lng: 31.5134066, lat: 30.2698194),
    ],
  ),
  ObourDistrictPolygon(
    name: 'جمعية عرابي',
    ring: [
      (lng: 31.4894442, lat: 30.1670813),
      (lng: 31.5614992, lat: 30.1756884),
      (lng: 31.5504524, lat: 30.2531061),
      (lng: 31.508217, lat: 30.2501153),
      (lng: 31.4751551, lat: 30.2136191),
      (lng: 31.4894442, lat: 30.1670813),
    ],
  ),
];

enum ObourDetectStatus { district, cityOnly, outsideCity }

class ObourDetectResult {
  const ObourDetectResult.district(this.districtName)
      : status = ObourDetectStatus.district;
  const ObourDetectResult.cityOnly()
      : status = ObourDetectStatus.cityOnly,
        districtName = null;
  const ObourDetectResult.outsideCity()
      : status = ObourDetectStatus.outsideCity,
        districtName = null;

  final ObourDetectStatus status;
  final String? districtName;
}

bool pointInRing(double longitude, double latitude, List<LngLat> ring) {
  if (ring.length < 4) {
    return false;
  }

  var inside = false;
  for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    final xi = ring[i].lng;
    final yi = ring[i].lat;
    final xj = ring[j].lng;
    final yj = ring[j].lat;
    final intersect = (yi > latitude) != (yj > latitude) &&
        longitude <
            ((xj - xi) * (latitude - yi)) / (yj - yi + 1e-15) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

double ringArea(List<LngLat> ring) {
  var sum = 0.0;
  for (var i = 0; i < ring.length - 1; i++) {
    sum += ring[i].lng * ring[i + 1].lat - ring[i + 1].lng * ring[i].lat;
  }
  return sum.abs() / 2;
}

/// 1) خارج العبور → outsideCity
/// 2) جوه حي → district (أصغر مضلع عند التداخل)
/// 3) جوه العبور بدون حي → cityOnly
ObourDetectResult detectObourDistrict(double latitude, double longitude) {
  if (!pointInRing(longitude, latitude, obourCityRing)) {
    return const ObourDetectResult.outsideCity();
  }

  ObourDistrictPolygon? best;
  var bestArea = double.infinity;

  for (final polygon in obourDistrictPolygons) {
    if (!pointInRing(longitude, latitude, polygon.ring)) {
      continue;
    }
    final area = ringArea(polygon.ring);
    if (area < bestArea) {
      bestArea = area;
      best = polygon;
    }
  }

  if (best != null) {
    return ObourDetectResult.district(best.name);
  }

  return const ObourDetectResult.cityOnly();
}
