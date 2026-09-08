import Link from "next/link";

import { LiveRefreshListener } from "@/components/live-refresh-listener";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

import { markAllNotificationsRead, markNotificationRead } from "./actions";

export default async function NotificationsPage() {
  const user = await requireAuth();

  const notifications = await db.notification.findMany({
    where: {
      userId: user.appUserId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <LiveRefreshListener
        channelName={`user-${user.appUserId}`}
        eventNames={["notification:new"]}
      />
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
          >
            العودة إلى اللوحة
          </Link>
          <h1 className="mt-3 text-3xl font-bold">الإشعارات</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            هذه أول نسخة من مركز الإشعارات داخل التطبيق، ويعرض الإشعارات الناتجة
            عن الطلبات، العربون، والمحادثة.
          </p>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">كل الإشعارات</h2>
            <form action={markAllNotificationsRead}>
              <button
                type="submit"
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
              >
                تعليم الكل كمقروء
              </button>
            </form>
          </div>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                لا توجد إشعارات بعد.
              </div>
            ) : (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`rounded-2xl border px-4 py-4 ${
                    notification.isRead
                      ? "border-zinc-200 bg-white"
                      : "border-orange-200 bg-orange-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{notification.title}</h2>
                    <span className="text-xs text-zinc-500">
                      {notification.isRead ? "مقروء" : "جديد"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-zinc-700">
                    {notification.body}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {notification.orderId ? (
                      <Link
                        href={`/orders/${notification.orderId}`}
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
                          className="text-sm font-medium text-zinc-700 underline underline-offset-4"
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
      </div>
    </main>
  );
}
