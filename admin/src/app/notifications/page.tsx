import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { LiveRefreshListener } from "@/components/live-refresh-listener";
import { requireAppAccount } from "@/lib/app-gate";
import { db } from "@/lib/db";

import { markAllNotificationsRead, markNotificationRead } from "./actions";

export default async function NotificationsPage() {
  const user = await requireAppAccount();

  const notifications = await db.notification.findMany({
    where: {
      userId: user.appUserId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const unreadNotificationsCount = notifications.filter((item) => !item.isRead)
    .length;

  return (
    <AppShell
      mode={user.role === "kitchen_owner" ? "kitchen" : "customer"}
      userId={user.appUserId}
      unreadNotificationsCount={unreadNotificationsCount}
      title="الإشعارات"
      subtitle="تنبيهات الطلبات والعربون والمحادثة لحظة بلحظة."
    >
      <LiveRefreshListener
        channelName={`user-${user.appUserId}`}
        eventNames={["notification:new"]}
      />

      <section className="border border-[#ead9c8] bg-white p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">كل الإشعارات</h2>
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="border border-[#ead9c8] px-4 py-2 text-sm font-medium"
            >
              تعليم الكل كمقروء
            </button>
          </form>
        </div>
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-[#fff8f1] px-4 py-4 text-sm text-[#6b4a3a]">
              لا توجد إشعارات بعد.
            </div>
          ) : (
            notifications.map((notification) => (
              <article
                key={notification.id}
                className={`border px-4 py-4 ${
                  notification.isRead
                    ? "border-[#ead9c8] bg-white"
                    : "border-orange-200 bg-orange-50"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold">{notification.title}</h2>
                  <span className="text-xs text-[#6b4a3a]">
                    {notification.isRead ? "مقروء" : "جديد"}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[#4a2e22]">
                  {notification.body}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {notification.orderId ? (
                    <Link
                      href={
                        user.role === "kitchen_owner"
                          ? `/dashboard/orders`
                          : `/orders/${notification.orderId}`
                      }
                      className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
                    >
                      فتح الطلب المرتبط
                    </Link>
                  ) : null}
                  {!notification.isRead ? (
                    <form action={markNotificationRead}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={notification.id}
                      />
                      <button
                        type="submit"
                        className="text-sm font-medium text-[#6b4a3a] underline underline-offset-4"
                      >
                        تعليم كمقروء
                      </button>
                    </form>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
