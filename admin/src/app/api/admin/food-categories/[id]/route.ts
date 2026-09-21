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
      label?: string;
      thumb?: string;
      keywords?: string[] | string;
      isActive?: boolean;
      sortOrder?: number;
    };

    const existing = await db.foodCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "الفئة غير موجودة." }, { status: 404 });
    }

    const nextLabel = payload.label?.trim();
    const nextThumb = payload.thumb?.trim();
    const keywords =
      payload.keywords === undefined
        ? undefined
        : normalizeKeywords(payload.keywords);

    const category = await db.foodCategory.update({
      where: { id },
      data: {
        ...(nextLabel ? { label: nextLabel } : {}),
        ...(nextThumb ? { thumb: nextThumb.slice(0, 8) } : {}),
        ...(keywords ? { keywords } : {}),
        ...(payload.isActive != null ? { isActive: payload.isActive } : {}),
        ...(typeof payload.sortOrder === "number"
          ? { sortOrder: payload.sortOrder }
          : {}),
      },
    });

    const menuItemCount = await db.menuItem.count({
      where: { categoryId: category.slug },
    });

    return NextResponse.json({
      category: { ...category, menuItemCount },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث الفئة.";
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
    const existing = await db.foodCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "الفئة غير موجودة." }, { status: 404 });
    }

    const menuItemCount = await db.menuItem.count({
      where: { categoryId: existing.slug },
    });

    if (menuItemCount > 0) {
      const category = await db.foodCategory.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        category: { ...category, menuItemCount },
        softDeleted: true,
        message: "الفئة مستخدمة في وجبات؛ تم إخفاؤها بدل الحذف النهائي.",
      });
    }

    await db.foodCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true, softDeleted: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر حذف الفئة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeKeywords(value: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return value
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
