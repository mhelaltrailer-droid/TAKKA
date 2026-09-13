import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuItemNeedsAdminReviewWhere } from "@/lib/moderation";
import { getFoodCategoryById } from "@/lib/food-categories";

export default async function AdminMenuItemsQueuePage() {
  await requireRole(["admin"]);

  const items = await db.menuItem.findMany({
    where: menuItemNeedsAdminReviewWhere(),
    include: {
      kitchen: {
        select: {
          id: true,
          kitchenName: true,
          approvalStatus: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            مراجعة الأصناف
          </p>
          <h1 className="mt-2 text-3xl font-bold">اعتماد الأطباق والأصناف</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            الأصناف الجديدة وتعديلات الأصناف المعتمدة تظهر هنا قبل النشر للعملاء.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
            <Link
              href="/dashboard/admin/kitchens"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              مراجعة المطابخ
            </Link>
          </div>
        </header>

        <section className="space-y-4">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600">
              لا توجد أصناف بانتظار الاعتماد.
            </div>
          ) : (
            items.map((item) => {
              const isDraft = item.draftStatus === "PENDING";
              const title = isDraft ? item.pendingName || item.name : item.name;
              const categoryId = isDraft
                ? item.pendingCategoryId || item.categoryId
                : item.categoryId;
              const category = getFoodCategoryById(categoryId);

              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex gap-4">
                    {(isDraft ? item.pendingImageUrl : item.imageUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={(isDraft ? item.pendingImageUrl : item.imageUrl) || ""}
                        alt={title}
                        className="h-20 w-20 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100 text-xs text-zinc-500">
                        بلا صورة
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{title}</h2>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          {isDraft ? "تعديل معلّق" : "صنف جديد"}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600">
                        {item.kitchen.kitchenName} · {category?.label || categoryId}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/admin/menu-items/${item.id}`}
                    className="inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    مراجعة الصنف
                  </Link>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
