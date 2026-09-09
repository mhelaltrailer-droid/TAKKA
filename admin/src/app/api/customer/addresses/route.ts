import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertObourLocation } from "@/lib/districts";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

type AddressPayload = {
  label: string;
  cityName: string;
  regionName: string;
  addressLine: string;
  landmark?: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault?: boolean;
};

export async function GET() {
  try {
    const user = await requireAuth();

    const addresses = await db.customerAddress.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        region: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل العناوين.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as AddressPayload;
    const cityName = (payload.cityName || OBOUR_CITY_NAME).trim();
    const regionName = payload.regionName?.trim() ?? "";

    if (!payload.label || !regionName || !payload.addressLine) {
      return NextResponse.json(
        { error: "بيانات العنوان غير مكتملة." },
        { status: 400 },
      );
    }

    const locationError = await assertObourLocation(cityName, regionName);
    if (locationError) {
      return NextResponse.json({ error: locationError }, { status: 400 });
    }

    const region = await db.region.upsert({
      where: {
        cityName_regionName: {
          cityName,
          regionName,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        cityName,
        regionName,
      },
    });

    if (payload.isDefault) {
      await db.customerAddress.updateMany({
        where: {
          customerId: user.appUserId,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const address = await db.customerAddress.create({
      data: {
        customerId: user.appUserId,
        label: payload.label.trim(),
        cityName,
        regionId: region.id,
        addressLine: payload.addressLine.trim(),
        landmark: payload.landmark?.trim() || null,
        latitude:
          typeof payload.latitude === "number" ? payload.latitude : null,
        longitude:
          typeof payload.longitude === "number" ? payload.longitude : null,
        isDefault: Boolean(payload.isDefault),
      },
      include: {
        region: true,
      },
    });

    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حفظ العنوان.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
