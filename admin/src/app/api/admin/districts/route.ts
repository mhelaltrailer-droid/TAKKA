import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureDefaultObourDistricts,
  listAllObourDistricts,
} from "@/lib/districts";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const districts = await listAllObourDistricts();
    return NextResponse.json({
      cityName: OBOUR_CITY_NAME,
      districts,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الأحياء.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const payload = (await request.json()) as { regionName?: string };
    const regionName = payload.regionName?.trim() ?? "";

    if (!regionName) {
      return NextResponse.json(
        { error: "اسم الحي مطلوب." },
        { status: 400 },
      );
    }

    await ensureDefaultObourDistricts();

    const district = await db.region.upsert({
      where: {
        cityName_regionName: {
          cityName: OBOUR_CITY_NAME,
          regionName,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        cityName: OBOUR_CITY_NAME,
        regionName,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            kitchens: true,
            customerAddresses: true,
          },
        },
      },
    });

    return NextResponse.json({ district }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إضافة الحي.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
