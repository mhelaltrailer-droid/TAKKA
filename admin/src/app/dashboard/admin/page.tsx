import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";
import { menuItemNeedsAdminReviewWhere } from "@/lib/moderation";

import { toggleRegionStatus } from "./actions";

export default async function AdminOperationsPage() {
  await requireRole(["admin"]);

  const [
    pendingKitchensCount,
    pendingMenuItemsCount,
    regions,
    usersCount,
    recentOrders,
    newKitchenLeadsCount,
  ] = await Promise.all([
    db.kitchen.count({ where: { approvalStatus: "PENDING" } }),
    db.menuItem.count({ where: menuItemNeedsAdminReviewWhere() }),
    db.region.findMany({
      orderBy: [{ cityName: "asc" }, { regionName: "asc" }],
    }),
    db.user.count(),
    db.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        kitchen: { select: { kitchenName: true } },
        customer: { select: { fullName: true } },
      },
    }),
    db.kitchenJoinLead.count({ where: { status: "NEW" } }),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Admin Approval & Operations
          </p>
          <h1 className="mt-2 text-3xl font-bold">لوحة الإدارة التشغيلية</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            اعتمد المطابخ والأصناف، وأدر المناطق والعروض من مكان واحد.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              العودة إلى اللوحة
            </Link>
            <Link
              href="/dashboard/admin/kitchens"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
            >
              <span aria-hidden>🏠</span>
              اعتماد المطابخ
              {pendingKitchensCount > 0 ? ` (${pendingKitchensCount})` : ""}
            </Link>
            <Link
              href="/dashboard/admin/menu-items"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-secondary)] px-4 py-2 text-sm font-medium text-white"
            >
              <span aria-hidden>🍽️</span>
              اعتماد الأصناف
              {pendingMenuItemsCount > 0 ? ` (${pendingMenuItemsCount})` : ""}
            </Link>
            <Link
              href="/dashboard/admin/analytics"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              الإحصائيات
            </Link>
            <Link
              href="/dashboard/admin/users"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              إدارة المستخدمين
            </Link>
            <Link
              href="/dashboard/admin/districts"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              إدارة الأحياء
            </Link>
            <Link
              href="/dashboard/admin/promos"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              عروض الشريط
            </Link>
            <Link
              href="/dashboard/admin/leads"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              ليدز انضمام المطابخ
              {newKitchenLeadsCount > 0 ? ` (${newKitchenLeadsCount})` : ""}
            </Link>
            <Link
              href="/dashboard/admin/chats"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              أرشيف المحادثات
            </Link>
            <Link
              href="/dashboard/orders"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              متابعة الطلبات
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-4">
          <Link
            href="/dashboard/admin/kitchens"
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[var(--brand-primary)]"
          >
            <p className="text-sm text-zinc-500">مطابخ بانتظار الاعتماد</p>
            <p className="mt-3 text-3xl font-bold">{pendingKitchensCount}</p>
          </Link>
          <Link
            href="/dashboard/admin/menu-items"
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[var(--brand-primary)]"
          >
            <p className="text-sm text-zinc-500">أصناف بانتظار الاعتماد</p>
            <p className="mt-3 text-3xl font-bold">{pendingMenuItemsCount}</p>
          </Link>
          <Link
            href="/dashboard/admin/leads"
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[var(--brand-primary)]"
          >
            <p className="text-sm text-zinc-500">ليدز انضمام جديدة</p>
            <p className="mt-3 text-3xl font-bold">{newKitchenLeadsCount}</p>
          </Link>
          <Link
            href="/dashboard/admin/users"
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-[var(--brand-primary)]"
          >
            <p className="text-sm text-zinc-500">إجمالي المستخدمين</p>
            <p className="mt-3 text-3xl font-bold">{usersCount}</p>
          </Link>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">اختصارات المراجعة</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Link
                href="/dashboard/admin/kitchens"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-[var(--brand-primary)]"
              >
                <p className="text-2xl" aria-hidden>
                  🏠
                </p>
                <p className="mt-2 font-semibold">اعتماد المطابخ</p>
                <p className="mt-1 text-sm text-zinc-600">
                  عرض كامل البيانات والصور والمستندات
                </p>
              </Link>
              <Link
                href="/dashboard/admin/menu-items"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-[var(--brand-primary)]"
              >
                <p className="text-2xl" aria-hidden>
                  🍽️
                </p>
                <p className="mt-2 font-semibold">اعتماد الأصناف</p>
                <p className="mt-1 text-sm text-zinc-600">
                  أصناف جديدة وتعديلات معلّقة قبل النشر
                </p>
              </Link>
              <Link
                href="/dashboard/admin/analytics"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-[var(--brand-primary)]"
              >
                <p className="text-2xl" aria-hidden>
                  📊
                </p>
                <p className="mt-2 font-semibold">الإحصائيات</p>
                <p className="mt-1 text-sm text-zinc-600">
                  إجمالي المنصة وتفصيل كل مطبخ مع فلتر المدة
                </p>
              </Link>
              <Link
                href="/dashboard/admin/users"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-[var(--brand-primary)]"
              >
                <p className="text-2xl" aria-hidden>
                  👤
                </p>
                <p className="mt-2 font-semibold">إدارة المستخدمين</p>
                <p className="mt-1 text-sm text-zinc-600">
                  إضافة وتعديل الأدوار والتعطيل والحذف
                </p>
              </Link>
              <Link
                href="/dashboard/admin/leads"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-[var(--brand-primary)]"
              >
                <p className="text-2xl" aria-hidden>
                  📋
                </p>
                <p className="mt-2 font-semibold">ليدز انضمام المطابخ</p>
                <p className="mt-1 text-sm text-zinc-600">
                  متابعة التسجيل السريع من صفحة الانضمام وحالات التواصل
                </p>
              </Link>
              <Link
                href="/dashboard/admin/chats"
                className="rounded-2xl border border-zinc-200 p-5 transition hover:border-[var(--brand-primary)]"
              >
                <p className="text-2xl" aria-hidden>
                  💬
                </p>
                <p className="mt-2 font-semibold">أرشيف المحادثات</p>
                <p className="mt-1 text-sm text-zinc-600">
                  كل محادثات العملاء والمطابخ مع الصور وتصدير PDF للنزاعات
                </p>
              </Link>
            </div>
          </div>

          <div className="space-y-8">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">المناطق</h2>
              <div className="mt-5 space-y-3">
                {regions.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                    لا توجد مناطق مسجلة حتى الآن.
                  </div>
                ) : (
                  regions.slice(0, 8).map((region) => (
                    <div
                      key={region.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium">
                          {region.cityName} - {region.regionName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {region.isActive ? "نشطة" : "موقوفة"}
                        </p>
                      </div>
                      <form action={toggleRegionStatus}>
                        <input type="hidden" name="regionId" value={region.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                        >
                          {region.isActive ? "إيقاف" : "تفعيل"}
                        </button>
                      </form>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">آخر الطلبات</h2>
              <div className="mt-5 space-y-3">
                {recentOrders.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                    لا توجد طلبات بعد.
                  </div>
                ) : (
                  recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-zinc-200 px-4 py-3"
                    >
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {order.kitchen.kitchenName} |{" "}
                        {order.customer.fullName || "عميل"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {getOrderStatusLabel(order.status)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
