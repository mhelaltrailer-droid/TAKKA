import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";

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
      title?: string;
      subtitle?: string | null;
      imageUrl?: string;
      priceLabel?: string | null;
      oldPriceLabel?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    };

    const banner = await db.promoBanner.update({
      where: { id },
      data: {
        ...(payload.title != null ? { title: payload.title.trim() } : {}),
        ...(payload.subtitle !== undefined
          ? { subtitle: payload.subtitle?.trim() || null }
          : {}),
        ...(payload.imageUrl != null
          ? { imageUrl: payload.imageUrl.trim() }
          : {}),
        ...(payload.priceLabel !== undefined
          ? { priceLabel: payload.priceLabel?.trim() || null }
          : {}),
        ...(payload.oldPriceLabel !== undefined
          ? { oldPriceLabel: payload.oldPriceLabel?.trim() || null }
          : {}),
        ...(payload.sortOrder != null ? { sortOrder: payload.sortOrder } : {}),
        ...(payload.isActive != null ? { isActive: payload.isActive } : {}),
      },
    });

    return NextResponse.json({ banner });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث العرض.";
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
    await db.promoBanner.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حذف العرض.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
