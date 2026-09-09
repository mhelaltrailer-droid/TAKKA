import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureDefaultPromoBanners } from "@/lib/promos";

import { PromoManager } from "./promo-manager";

export default async function AdminPromosPage() {
  await requireRole(["admin"]);
  await ensureDefaultPromoBanners();

  const banners = await db.promoBanner.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Home Promo Carousel
          </p>
          <h1 className="mt-2 text-3xl font-bold">صور وعروض الشريط الرئيسي</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            ارفع صور الأكل والوصفات والعروض لتظهر تلقائيًا في الصفحة الرئيسية
            للعملاء على الويب وتطبيق الموبايل.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              العودة للوحة الإدارة
            </Link>
          </div>
        </header>

        <PromoManager initialBanners={banners} />
      </div>
    </main>
  );
}
