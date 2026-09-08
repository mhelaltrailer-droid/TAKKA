import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { OrderStatus } from "@prisma/client";

import { LiveNotificationBell } from "@/components/live-notification-bell";
import { StatusPill } from "@/components/status-pill";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRoleLabel } from "@/lib/roles";
import {
  getApprovalStatusLabel,
  getAvailabilityStatusLabel,
} from "@/lib/status-labels";

export default async function DashboardPage() {
  const user = await requireAuth();
  const unreadNotificationsCount = await db.notification.count({
    where: {
      userId: user.appUserId,
      isRead: false,
    },
  });
  const kitchen =
    user.role === "kitchen_owner"
      ? await db.kitchen.findUnique({
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
        ])
      : null;
  const adminStats =
    user.role === "admin"
      ? await Promise.all([
          db.kitchen.count({
            where: {
              approvalStatus: "PENDING",
            },
          }),
          db.order.count({
            where: {
              status: OrderStatus.PENDING_KITCHEN_APPROVAL,
            },
          }),
        ])
      : null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--brand-secondary)]">
              لوحة التحكم
            </p>
            <h1 className="text-3xl font-bold">مرحبًا بك في تكة</h1>
            <p className="text-zinc-600">
              تم تفعيل المصادقة الأساسية بنجاح، وهذه أول لوحة محمية داخل النظام.
            </p>
          </div>
          <div className="flex items-center gap-4 self-start rounded-2xl bg-zinc-50 px-4 py-3">
            <div className="text-sm">
              <p className="font-semibold">{user.fullName ?? "مستخدم"}</p>
              <p className="text-zinc-600">
                {user.role ? getRoleLabel(user.role) : "بدون دور محدد بعد"}
              </p>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <div className="flex justify-end">
          <LiveNotificationBell
            userId={user.appUserId}
            initialUnreadCount={unreadNotificationsCount}
          />
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">المصادقة</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              المصادقة تعمل عبر Clerk، مع حماية المسارات غير العامة من خلال
              `middleware`.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">الأدوار</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              تم تأسيس أدوار `customer` و`kitchen_owner` و`admin` لتستخدم لاحقًا
              في حماية الصفحات والـ APIs.
            </p>
          </div>

          {user.role === "customer" && customerStats ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">ملخص العميل</h2>
              <div className="mt-4 space-y-2 text-sm text-zinc-600">
                <p>العناوين المحفوظة: {customerStats[0]}</p>
                <p>إجمالي الطلبات: {customerStats[1]}</p>
              </div>
            </div>
          ) : null}

          {user.role === "kitchen_owner" && kitchen ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">ملخص المطبخ</h2>
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
                  label={getAvailabilityStatusLabel(kitchen.availabilityStatus)}
                  tone={kitchen.availabilityStatus === "OPEN" ? "success" : "neutral"}
                />
              </div>
              <div className="mt-4 space-y-2 text-sm text-zinc-600">
                <p>الأصناف: {kitchen._count.menuItems}</p>
                <p>الطلبات: {kitchen._count.orders}</p>
              </div>
            </div>
          ) : null}

          {user.role === "admin" && adminStats ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">ملخص الإدارة</h2>
              <div className="mt-4 space-y-2 text-sm text-zinc-600">
                <p>مطابخ بانتظار الاعتماد: {adminStats[0]}</p>
                <p>طلبات بانتظار مراجعة المطبخ: {adminStats[1]}</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">الخطوة التالية</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
              الروابط والإجراءات الظاهرة هنا تتغير الآن بحسب الدور الحالي
              للمستخدم داخل النظام.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {user.role === "customer" ? (
                <>
                  <Link
                    href="/kitchens"
                    className="inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    استعراض المطابخ
                  </Link>
                  <Link
                    href="/dashboard/kitchen/onboarding"
                    className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                  >
                    التحول إلى صاحب مطبخ
                  </Link>
                  <Link
                    href="/addresses"
                    className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                  >
                    إدارة العناوين
                  </Link>
                </>
              ) : null}

              {user.role === "kitchen_owner" ? (
                <>
                  <Link
                    href="/dashboard/kitchen/onboarding"
                    className="inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    إعداد المطبخ
                  </Link>
                  <Link
                    href="/dashboard/menu"
                    className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                  >
                    إدارة المنيو
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                  >
                    إدارة الطلبات
                  </Link>
                </>
              ) : null}

              {user.role === "admin" ? (
                <>
                  <Link
                    href="/dashboard/admin"
                    className="inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    عمليات الإدارة
                  </Link>
                  <Link
                    href="/dashboard/orders"
                    className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                  >
                    متابعة الطلبات
                  </Link>
                </>
              ) : null}

              <Link
                href="/notifications"
                className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
              >
                الإشعارات
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
