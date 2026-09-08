import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type AddressPayload = {
  label?: string;
  cityName?: string;
  regionName?: string;
  addressLine?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const payload = (await request.json()) as AddressPayload;

    const existingAddress = await db.customerAddress.findFirst({
      where: {
        id,
        customerId: user.appUserId,
      },
      select: {
        id: true,
      },
    });

    if (!existingAddress) {
      return NextResponse.json({ error: "العنوان غير موجود." }, { status: 404 });
    }

    let regionId: string | undefined;

    if (payload.cityName && payload.regionName) {
      const region = await db.region.upsert({
        where: {
          cityName_regionName: {
            cityName: payload.cityName.trim(),
            regionName: payload.regionName.trim(),
          },
        },
        update: {
          isActive: true,
        },
        create: {
          cityName: payload.cityName.trim(),
          regionName: payload.regionName.trim(),
        },
      });

      regionId = region.id;
    }

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

    const address = await db.customerAddress.update({
      where: {
        id: existingAddress.id,
      },
      data: {
        ...(payload.label ? { label: payload.label.trim() } : {}),
        ...(payload.cityName ? { cityName: payload.cityName.trim() } : {}),
        ...(regionId ? { regionId } : {}),
        ...(payload.addressLine
          ? { addressLine: payload.addressLine.trim() }
          : {}),
        ...(payload.landmark !== undefined
          ? { landmark: payload.landmark?.trim() || null }
          : {}),
        ...(payload.latitude !== undefined ? { latitude: payload.latitude } : {}),
        ...(payload.longitude !== undefined
          ? { longitude: payload.longitude }
          : {}),
        ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
      },
      include: {
        region: true,
      },
    });

    return NextResponse.json({ address });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث العنوان.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const deleted = await db.customerAddress.deleteMany({
      where: {
        id,
        customerId: user.appUserId,
      },
    });

    if (!deleted.count) {
      return NextResponse.json({ error: "العنوان غير موجود." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حذف العنوان.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
