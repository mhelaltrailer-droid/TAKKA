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
          db.kitchen.count({
            where: {
              approvalStatus: "APPROVED",
            },
          }),
          db.user.count(),
        ])
      : null;

  const roleTitle =
    user.role === "admin"
      ? "لوحة الإدارة"
      : user.role === "kitchen_owner"
        ? "لوحة المطبخ"
        : "لوحتي";

  const roleSubtitle =
    user.role === "admin"
      ? "راجع اعتماد المطابخ، راقب الطلبات، وتابع تشغيل المنصة."
      : user.role === "kitchen_owner"
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

        {user.role === "admin" && adminStats ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="border border-[#ead9c8] bg-white p-5">
                <p className="text-sm text-[#6b4a3a]">مطابخ بانتظار الاعتماد</p>
                <p className="mt-2 text-3xl font-bold">{adminStats[0]}</p>
              </div>
              <div className="border border-[#ead9c8] bg-white p-5">
                <p className="text-sm text-[#6b4a3a]">طلبات بانتظار المطبخ</p>
                <p className="mt-2 text-3xl font-bold">{adminStats[1]}</p>
              </div>
              <div className="border border-[#ead9c8] bg-white p-5">
                <p className="text-sm text-[#6b4a3a]">مطابخ معتمدة</p>
                <p className="mt-2 text-3xl font-bold">{adminStats[2]}</p>
              </div>
              <div className="border border-[#ead9c8] bg-white p-5">
                <p className="text-sm text-[#6b4a3a]">إجمالي المستخدمين</p>
                <p className="mt-2 text-3xl font-bold">{adminStats[3]}</p>
              </div>
            </section>

            <section className="border border-[#ead9c8] bg-white p-6">
              <h2 className="text-xl font-bold">إجراءات سريعة</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                <ActionLink href="/dashboard/admin" label="عمليات الإدارة" primary />
                <ActionLink href="/dashboard/orders" label="متابعة الطلبات" />
                <ActionLink href="/kitchens" label="عرض المطابخ" />
                <ActionLink href="/notifications" label="الإشعارات" />
              </div>
            </section>
          </>
        ) : null}

        {user.role === "kitchen_owner" ? (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="border border-[#ead9c8] bg-white p-5 md:col-span-2">
                <h2 className="text-xl font-bold">
                  {kitchen?.kitchenName ?? "ملف المطبخ"}
                </h2>
                {kitchen ? (
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
                  <ActionLink href="/notifications" label="الإشعارات" />
                </div>
              </div>
            </section>
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
                <ActionLink href="/addresses" label="إدارة العناوين" />
                <ActionLink href="/notifications" label="الإشعارات" />
                <ActionLink
                  href="/dashboard/kitchen/onboarding"
                  label="سجّل كمطبخ"
                />
              </div>
            </section>
          </>
        ) : null}

        {!user.role ||
        (user.role !== "admin" &&
          user.role !== "kitchen_owner" &&
          user.role !== "customer") ? (
          <section className="border border-[#ead9c8] bg-white p-6">
            <h2 className="text-xl font-bold">أكمل إعداد حسابك</h2>
            <p className="mt-3 text-sm leading-7 text-[#6b4a3a]">
              لم يتم تحديد دور واضح بعد. يمكنك البدء كعميل أو كمطبخ.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionLink href="/kitchens" label="استعراض المطابخ" primary />
              <ActionLink
                href="/dashboard/kitchen/onboarding"
                label="التسجيل كمطبخ"
              />
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
