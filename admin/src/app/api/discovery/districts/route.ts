import { NextResponse } from "next/server";

import { listActiveObourDistricts } from "@/lib/districts";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

export async function GET() {
  try {
    const districts = await listActiveObourDistricts();

    return NextResponse.json({
      cityName: OBOUR_CITY_NAME,
      districts: districts.map((district) => ({
        id: district.id,
        regionName: district.regionName,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الأحياء.";

    return NextResponse.json(
      {
        cityName: OBOUR_CITY_NAME,
        districts: [],
        error: message,
      },
      { status: 500 },
    );
  }
}
