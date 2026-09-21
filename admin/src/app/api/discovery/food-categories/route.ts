import { NextResponse } from "next/server";

import { listActiveFoodCategories } from "@/lib/food-category-catalog";
import { DEFAULT_FOOD_CATEGORIES } from "@/lib/food-categories";

export async function GET() {
  try {
    const categories = await listActiveFoodCategories();

    return NextResponse.json({ categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الفئات.";

    return NextResponse.json(
      {
        categories: DEFAULT_FOOD_CATEGORIES,
        error: message,
      },
      { status: 500 },
    );
  }
}
