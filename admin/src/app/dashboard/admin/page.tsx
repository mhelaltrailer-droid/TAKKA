import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";

import { approveKitchen, rejectKitchen, toggleRegionStatus } from "./actions";

export default async function AdminOperationsPage() {
  await requireRole(["admin"]);

  const [pendingKitchens, regions, usersCount, ordersCount, recentOrders] =
    await Promise.all([
      db.kitchen.findMany({
        where: {
          approvalStatus: "PENDING",
        },
        include: {
          region: true,
          paymentMethods: true,
          documents: true,
          owner: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      db.region.findMany({
        orderBy: [{ cityName: "asc" }, { regionName: "asc" }],
      }),
      db.user.count(),
      db.order.count(),
      db.order.findMany({
        take: 8,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          kitchen: {
            select: {
              kitchenName: true,
            },
          },
          customer: {
            select: {
              fullName: true,
            },
          },
        },
      }),
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
            من هنا تستطيع الإدارة اعتماد المطابخ، التحكم في المناطق، ومراجعة
            آخر الطلبات والحالة التشغيلية العامة للمنصة.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              العودة إلى اللوحة
            </Link>
            <Link
              href="/dashboard/orders"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              متابعة الطلبات
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">المطابخ قيد المراجعة</p>
            <p className="mt-3 text-3xl font-bold">{pendingKitchens.length}</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">إجمالي المستخدمين</p>
            <p className="mt-3 text-3xl font-bold">{usersCount}</p>
          </div>
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">إجمالي الطلبات</p>
            <p className="mt-3 text-3xl font-bold">{ordersCount}</p>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">طلبات اعتماد المطابخ</h2>
            <div className="mt-5 space-y-5">
              {pendingKitchens.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                  لا توجد طلبات اعتماد معلقة حاليًا.
                </div>
              ) : (
                pendingKitchens.map((kitchen) => {
                  const paymentMethod = kitchen.paymentMethods[0];
                  const nationalId = kitchen.documents.find(
                    (document) => document.documentType === "national_id",
                  );

                  return (
                    <article
                      key={kitchen.id}
                      className="rounded-2xl border border-zinc-200 p-5"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {kitchen.kitchenName}
                          </h3>
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                            قيد المراجعة
                          </span>
                        </div>

                        <div className="text-sm leading-7 text-zinc-600">
                          <p>المالك: {kitchen.owner.fullName}</p>
                          <p>
                            التواصل:{" "}
                            {kitchen.owner.phoneNumber ||
                              kitchen.owner.email ||
                              "غير متوفر"}
                          </p>
                          <p>
                            المنطقة: {kitchen.region.cityName} -{" "}
                            {kitchen.region.regionName}
                          </p>
                          <p>العنوان: {kitchen.addressLine}</p>
                          {paymentMethod ? (
                            <p>
                              InstaPay:{" "}
                              {paymentMethod.accountNumberOrHandle ||
                                paymentMethod.paymentLink ||
                                "غير مضاف"}
                            </p>
                          ) : null}
                        </div>

                        {nationalId?.fileUrl ? (
                          <a
                            href={nationalId.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
                          >
                            فتح صورة البطاقة الشخصية
                          </a>
                        ) : (
                          <p className="text-sm text-red-600">
                            لا توجد صورة بطاقة مرفوعة بعد.
                          </p>
                        )}

                        <div className="flex flex-wrap gap-3 pt-2">
                          <form action={approveKitchen}>
                            <input type="hidden" name="kitchenId" value={kitchen.id} />
                            <button
                              type="submit"
                              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
                            >
                              اعتماد المطبخ
                            </button>
                          </form>
                          <form action={rejectKitchen}>
                            <input type="hidden" name="kitchenId" value={kitchen.id} />
                            <button
                              type="submit"
                              className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                            >
                              رفض المطبخ
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
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
                  regions.map((region) => (
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
