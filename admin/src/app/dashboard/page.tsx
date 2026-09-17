import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { OrderStatus } from "@prisma/client";

import { LiveNotificationBell } from "@/components/live-notification-bell";
import { StatusPill } from "@/components/status-pill";
import { TakkaFamilyJoinCard } from "@/components/takka-family-join-card";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoleLabel } from "@/lib/roles";
import { getTakkaSurface } from "@/lib/surface";
import {
  getApprovalStatusLabel,
  getAvailabilityStatusLabel,
} from "@/lib/status-labels";
import {
  formatMoneyEg,
  getOrderStatsSummary,
  resolveStatsDateRange,
} from "@/lib/kitchen-order-stats";

function ActionLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-secondary)]"
          : "inline-flex border border-[#e8d5c4] bg-white px-5 py-3 text-sm font-semibold text-[#4a2e22] transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-secondary)]"
      }
    >
      {label}
    </Link>
  );
}

export default async function DashboardPage() {
  const headerStore = await headers();
  const surface = getTakkaSurface(headerStore.get("host"));

  if (surface === "admin") {
    redirect("/dashboard/admin");
  }

  const user = await requireAuth();

  if (user.needsRoleSetup) {
    redirect("/role-setup");
  }

  if (user.role === "admin") {
    redirect("/");
  }

  const unreadNotificationsCount = await db.notification.count({
    where: {
      userId: user.appUserId,
      isRead: false,
    },
  });

  const kitchen = await db.kitchen.findUnique({
    where: {
      ownerUserId: user.appUserId,
    },
    include: {
      _count: {
        select: {
          menuItems: true,
          orders: true,
        },
      },
    },
  });
  const hasKitchen = Boolean(kitchen);

  const kitchenOrderStats =
    user.role === "kitchen_owner" && kitchen
      ? await getOrderStatsSummary({
          range: resolveStatsDateRange(),
          kitchenId: kitchen.id,
        })
      : null;

  const customerStats =
    user.role === "customer"
      ? await Promise.all([
          db.customerAddress.count({
            where: {
              customerId: user.appUserId,
            },
          }),
          db.order.count({
            where: {
              customerId: user.appUserId,
            },
          }),
          db.order.count({
            where: {
              customerId: user.appUserId,
              status: {
                notIn: [
                  OrderStatus.COMPLETED,
                  OrderStatus.CANCELLED_BEFORE_DEPOSIT,
                  OrderStatus.CANCELLED_AFTER_DEPOSIT,
                  OrderStatus.REJECTED_BY_KITCHEN,
                ],
              },
            },
          }),
        ])
      : null;

  const roleTitle =
    user.role === "kitchen_owner" ? "لوحة المطبخ" : "لوحتي";

  const roleSubtitle =
    user.role === "kitchen_owner"
      ? "أدِر ملف مطبخك، المنيو، والطلبات من مكان واحد."
      : "اطلب من المطابخ القريبة، وتابع طلباتك وعناوينك بسهولة.";

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-6 border border-[#ead9c8] bg-white p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--brand-secondary)]">
              تكة
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">
              {roleTitle}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[#6b4a3a] md:text-base">
              مرحبًا {user.fullName ?? "بك"} — {roleSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-4 self-start">
            <LiveNotificationBell
              userId={user.appUserId}
              initialUnreadCount={unreadNotificationsCount}
            />
            <div className="flex items-center gap-3 border border-[#ead9c8] bg-[#fff8f1] px-4 py-3">
              <div className="text-sm">
                <p className="font-semibold">{user.fullName ?? "مستخدم"}</p>
                <p className="text-[#6b4a3a]">
                  {user.role ? getRoleLabel(user.role) : "بدون دور"}
                </p>
              </div>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </header>

        {user.role === "kitchen_owner" ? (
          <>
            {kitchen?.approvalStatus === "APPROVED" ? (
              <TakkaFamilyJoinCard />
            ) : null}
            <section className="grid gap-4 md:grid-cols-3">
              <div className="border border-[#ead9c8] bg-white p-5 md:col-span-2">
                <h2 className="text-xl font-bold">
                  {kitchen?.kitchenName ?? "ملف المطبخ"}
                </h2>
                {hasKitchen && kitchen ? (
                  <>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusPill
                        label={getApprovalStatusLabel(kitchen.approvalStatus)}
                        tone={
                          kitchen.approvalStatus === "APPROVED"
                            ? "success"
                            : kitchen.approvalStatus === "PENDING"
                              ? "warning"
                              : "danger"
                        }
                      />
                      <StatusPill
                        label={getAvailabilityStatusLabel(
                          kitchen.availabilityStatus,
                        )}
                        tone={
                          kitchen.availabilityStatus === "OPEN"
                            ? "success"
                            : "neutral"
                        }
                      />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-[#6b4a3a]">
                      <p>أصناف المنيو: {kitchen._count.menuItems}</p>
                      <p>إجمالي الطلبات: {kitchen._count.orders}</p>
                    </div>
                  </>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-[#6b4a3a]">
                    لم يكتمل إعداد المطبخ بعد. ابدأ بتعبئة بيانات المطبخ الآن.
                  </p>
                )}
              </div>
              <div className="border border-[#ead9c8] bg-white p-5">
                <h2 className="text-lg font-bold">ابدأ من هنا</h2>
                <div className="mt-4 flex flex-col gap-3">
                  <ActionLink
                    href="/dashboard/kitchen/onboarding"
                    label="إعداد المطبخ"
                    primary
                  />
                  <ActionLink href="/dashboard/menu" label="إدارة المنيو" />
                  <ActionLink href="/dashboard/orders" label="إدارة الطلبات" />
                  <ActionLink href="/dashboard/kitchen/stats" label="إحصائيات" />
                  <ActionLink href="/notifications" label="الإشعارات" />
                  <ActionLink href="/role-setup" label="تبديل الدور" />
                </div>
              </div>
            </section>

            {kitchenOrderStats ? (
              <section className="border border-[#ead9c8] bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">إحصائيات</h2>
                    <p className="mt-1 text-sm text-[#6b4a3a]">
                      آخر 30 يومًا · مطبخك فقط
                    </p>
                  </div>
                  <ActionLink
                    href="/dashboard/kitchen/stats"
                    label="عرض التفاصيل"
                  />
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-2xl bg-[#fff8f1] px-4 py-4">
                    <p className="text-sm text-[#6b4a3a]">الطلبات</p>
                    <p className="mt-1 text-2xl font-bold">
                      {kitchenOrderStats.totalOrders}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fff8f1] px-4 py-4">
                    <p className="text-sm text-[#6b4a3a]">مكتملة</p>
                    <p className="mt-1 text-2xl font-bold">
                      {kitchenOrderStats.completed}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fff8f1] px-4 py-4">
                    <p className="text-sm text-[#6b4a3a]">ملغاة</p>
                    <p className="mt-1 text-2xl font-bold">
                      {kitchenOrderStats.cancelledTotal}
                    </p>
                    <p className="mt-1 text-xs text-[#6b4a3a]">
                      رفض مطبخ {kitchenOrderStats.rejectedByKitchen} · إلغاء
                      عميل {kitchenOrderStats.cancelledByCustomer}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fff8f1] px-4 py-4">
                    <p className="text-sm text-[#6b4a3a]">مبيعات المكتملة</p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatMoneyEg(kitchenOrderStats.salesCompleted)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#fff8f1] px-4 py-4">
                    <p className="text-sm text-[#6b4a3a]">مشاهدات</p>
                    <p className="mt-1 text-2xl font-bold">
                      {kitchenOrderStats.viewsTotal}
                    </p>
                    <p className="mt-1 text-xs text-[#6b4a3a]">
                      زوار {kitchenOrderStats.uniqueVisitors} · تحويل{" "}
                      {kitchenOrderStats.conversionRate}%
                    </p>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {user.role === "customer" && customerStats ? (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="border border-[#ead9c8] bg-white p-5">
                <p className="text-sm text-[#6b4a3a]">عناويني</p>
                <p className="mt-2 text-3xl font-bold">{customerStats[0]}</p>
              </div>
              <div className="border border-[#ead9c8] bg-white p-5">
                <p className="text-sm text-[#6b4a3a]">كل الطلبات</p>
                <p className="mt-2 text-3xl font-bold">{customerStats[1]}</p>
              </div>
              <div className="border border-[#ead9c8] bg-white p-5">
                <p className="text-sm text-[#6b4a3a]">طلبات قيد المتابعة</p>
                <p className="mt-2 text-3xl font-bold">{customerStats[2]}</p>
              </div>
            </section>

            <section className="border border-[#ead9c8] bg-white p-6">
              <h2 className="text-xl font-bold">إجراءات سريعة</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <ActionLink href="/kitchens" label="استعراض المطابخ" primary />
                <ActionLink href="/orders" label="طلباتي" />
                <ActionLink href="/addresses" label="إدارة العناوين" />
                <ActionLink href="/notifications" label="الإشعارات" />
                <ActionLink
                  href={
                    hasKitchen
                      ? "/role-setup"
                      : "/dashboard/kitchen/onboarding"
                  }
                  label={
                    hasKitchen ? "العودة لمسار المطبخ" : "إنشاء حساب مطبخ"
                  }
                />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
