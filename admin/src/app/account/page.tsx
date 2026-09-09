import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { requireAppAccount } from "@/lib/app-gate";
import { db } from "@/lib/db";

import { AccountSignOutButton } from "./account-sign-out-button";

function formatPhone(phone: string | null | undefined) {
  const raw = (phone ?? "").trim();
  if (!raw) {
    return "لا يوجد رقم مسجّل";
  }
  if (raw.startsWith("+")) {
    return raw;
  }
  if (raw.startsWith("01") && raw.length === 11) {
    return `+20 ${raw.slice(1)}`;
  }
  return raw;
}

export default async function AccountPage() {
  const user = await requireAppAccount();

  const [dbUser, unreadNotificationsCount] = await Promise.all([
    db.user.findUnique({
      where: { id: user.appUserId },
      select: {
        fullName: true,
        phoneNumber: true,
      },
    }),
    db.notification.count({
      where: {
        userId: user.appUserId,
        isRead: false,
      },
    }),
  ]);

  const fullName = dbUser?.fullName || user.fullName || "مستخدم تكة";
  const phone = formatPhone(dbUser?.phoneNumber ?? user.phoneNumber);

  return (
    <AppShell
      mode="customer"
      userId={user.appUserId}
      unreadNotificationsCount={unreadNotificationsCount}
      activeNav="account"
    >
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-3xl font-bold text-[#3b2418]">حسابي</h1>

        <section className="rounded-3xl bg-[var(--brand-primary)] p-5 text-white shadow-sm">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold">{fullName}</p>
              <p className="mt-1 text-sm font-semibold text-white/90">{phone}</p>
              <span className="mt-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                حساب مشتري
              </span>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-3xl text-[#3b2418]">
              👤
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-[#3b2418]">الحساب</h2>

          <Link
            href="/notifications"
            className="flex items-center gap-3 rounded-2xl border border-[#ead9c8] bg-white px-3 py-3 transition hover:border-[var(--brand-primary)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f5e9] text-lg">
              🔔
            </span>
            <span className="flex-1 font-bold text-[#3b2418]">الإشعارات</span>
            {unreadNotificationsCount > 0 ? (
              <span className="rounded-full bg-[var(--brand-primary)] px-2 py-0.5 text-xs font-bold text-white">
                {unreadNotificationsCount}
              </span>
            ) : (
              <span className="text-[#6b4a3a]">‹</span>
            )}
          </Link>

          <Link
            href="/addresses"
            className="flex items-center gap-3 rounded-2xl border border-[#ead9c8] bg-white px-3 py-3 transition hover:border-[var(--brand-primary)]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e8] text-lg">
              📍
            </span>
            <span className="flex-1 font-bold text-[#3b2418]">عناوين التوصيل</span>
            <span className="text-[#6b4a3a]">‹</span>
          </Link>

          <AccountSignOutButton />
        </section>
      </div>
    </AppShell>
  );
}
