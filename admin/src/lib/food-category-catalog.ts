import { db } from "@/lib/db";
import {
  DEFAULT_FOOD_CATEGORIES,
  type FoodCategoryDef,
} from "@/lib/food-categories";

export type FoodCategoryRecord = {
  id: string;
  slug: string;
  label: string;
  thumb: string;
  keywords: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  menuItemCount: number;
};

function toPublicCategory(row: {
  slug: string;
  label: string;
  thumb: string;
  keywords: string[];
}): FoodCategoryDef {
  return {
    id: row.slug,
    label: row.label,
    thumb: row.thumb,
    keywords: row.keywords,
  };
}

export async function ensureDefaultFoodCategories() {
  const existing = await db.foodCategory.count();
  if (existing > 0) {
    return;
  }

  await db.foodCategory.createMany({
    data: DEFAULT_FOOD_CATEGORIES.map((category, index) => ({
      slug: category.id,
      label: category.label,
      thumb: category.thumb,
      keywords: category.keywords,
      sortOrder: index,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

export async function listActiveFoodCategories(): Promise<FoodCategoryDef[]> {
  await ensureDefaultFoodCategories();

  const rows = await db.foodCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    select: {
      slug: true,
      label: true,
      thumb: true,
      keywords: true,
    },
  });

  if (rows.length === 0) {
    return [...DEFAULT_FOOD_CATEGORIES];
  }

  return rows.map(toPublicCategory);
}

async function menuItemCountsBySlug(slugs: string[]) {
  if (slugs.length === 0) {
    return new Map<string, number>();
  }

  const groups = await db.menuItem.groupBy({
    by: ["categoryId"],
    where: { categoryId: { in: slugs } },
    _count: { _all: true },
  });

  return new Map(
    groups.map((group) => [group.categoryId, group._count._all] as const),
  );
}

export async function listAllFoodCategories(): Promise<FoodCategoryRecord[]> {
  await ensureDefaultFoodCategories();

  const rows = await db.foodCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });

  const counts = await menuItemCountsBySlug(rows.map((row) => row.slug));

  return rows.map((row) => ({
    ...row,
    menuItemCount: counts.get(row.slug) ?? 0,
  }));
}

export async function isActiveFoodCategorySlug(slug: string): Promise<boolean> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return false;
  }

  await ensureDefaultFoodCategories();

  const row = await db.foodCategory.findUnique({
    where: { slug: trimmed },
    select: { isActive: true },
  });

  return Boolean(row?.isActive);
}

export function slugifyFoodCategoryLabel(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

  if (base) {
    return base;
  }

  return `cat-${Date.now().toString(36)}`;
}
