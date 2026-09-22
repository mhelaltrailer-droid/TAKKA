import { NextResponse } from "next/server";

import { parseStoredPolygonRing } from "@/lib/district-polygon";
import { listActiveObourDistricts } from "@/lib/districts";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";
import { OBOUR_CITY_RING } from "@/lib/obour-geofence";

export async function GET() {
  try {
    const districts = await listActiveObourDistricts();

    return NextResponse.json({
      cityName: OBOUR_CITY_NAME,
      cityRing: OBOUR_CITY_RING,
      districts: districts.map((district) => ({
        id: district.id,
        regionName: district.regionName,
        polygonRing: parseStoredPolygonRing(district.polygonRingJson),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الأحياء.";

    return NextResponse.json(
      {
        cityName: OBOUR_CITY_NAME,
        cityRing: OBOUR_CITY_RING,
        districts: [],
        error: message,
      },
      { status: 500 },
    );
  }
}
