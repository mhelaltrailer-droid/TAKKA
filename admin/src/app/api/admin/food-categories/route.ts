import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureDefaultFoodCategories,
  listAllFoodCategories,
  slugifyFoodCategoryLabel,
} from "@/lib/food-category-catalog";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const categories = await listAllFoodCategories();
    return NextResponse.json({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الفئات.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const payload = (await request.json()) as {
      label?: string;
      thumb?: string;
      keywords?: string[] | string;
      slug?: string;
    };

    const label = payload.label?.trim() ?? "";
    if (!label) {
      return NextResponse.json({ error: "اسم الفئة مطلوب." }, { status: 400 });
    }

    const thumb = (payload.thumb?.trim() || "🍽️").slice(0, 8);
    const keywords = normalizeKeywords(payload.keywords);
    const requestedSlug = payload.slug?.trim().toLowerCase() ?? "";
    let slug = requestedSlug || slugifyFoodCategoryLabel(label);

    await ensureDefaultFoodCategories();

    const clash = await db.foodCategory.findUnique({ where: { slug } });
    if (clash) {
      if (!requestedSlug) {
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
      } else {
        return NextResponse.json(
          { error: "يوجد فئة بنفس المعرّف (slug) بالفعل." },
          { status: 400 },
        );
      }
    }

    const maxSort = await db.foodCategory.aggregate({
      _max: { sortOrder: true },
    });

    const created = await db.foodCategory.create({
      data: {
        slug,
        label,
        thumb,
        keywords: keywords.length > 0 ? keywords : [label],
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        category: {
          ...created,
          menuItemCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إضافة الفئة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeKeywords(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,،]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}
