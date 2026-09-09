import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const { id } = await context.params;
    const payload = (await request.json()) as {
      regionName?: string;
      isActive?: boolean;
    };

    const existing = await db.region.findUnique({ where: { id } });
    if (!existing || existing.cityName !== OBOUR_CITY_NAME) {
      return NextResponse.json({ error: "الحي غير موجود." }, { status: 404 });
    }

    const nextName = payload.regionName?.trim();
    if (nextName && nextName !== existing.regionName) {
      const clash = await db.region.findUnique({
        where: {
          cityName_regionName: {
            cityName: OBOUR_CITY_NAME,
            regionName: nextName,
          },
        },
      });
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: "يوجد حي بنفس الاسم بالفعل." },
          { status: 400 },
        );
      }
    }

    const district = await db.region.update({
      where: { id },
      data: {
        ...(nextName ? { regionName: nextName } : {}),
        ...(payload.isActive != null ? { isActive: payload.isActive } : {}),
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

    return NextResponse.json({ district });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث الحي.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await db.region.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            kitchens: true,
            customerAddresses: true,
            orders: true,
          },
        },
      },
    });

    if (!existing || existing.cityName !== OBOUR_CITY_NAME) {
      return NextResponse.json({ error: "الحي غير موجود." }, { status: 404 });
    }

    const inUse =
      existing._count.kitchens > 0 ||
      existing._count.customerAddresses > 0 ||
      existing._count.orders > 0;

    if (inUse) {
      const district = await db.region.update({
        where: { id },
        data: { isActive: false },
        include: {
          _count: {
            select: {
              kitchens: true,
              customerAddresses: true,
            },
          },
        },
      });

      return NextResponse.json({
        district,
        softDeleted: true,
        message: "الحي مستخدم؛ تم إخفاؤه بدل الحذف النهائي.",
      });
    }

    await db.region.delete({ where: { id } });
    return NextResponse.json({ ok: true, softDeleted: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حذف الحي.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
