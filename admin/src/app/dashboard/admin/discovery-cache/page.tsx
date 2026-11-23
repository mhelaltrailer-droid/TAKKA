import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getDiscoveryCacheSettings } from "@/lib/discovery-cache-settings-store";

import { DiscoveryCacheForm } from "./discovery-cache-form";

export default async function AdminDiscoveryCachePage() {
  await requireRole(["admin"]);
  const settings = await getDiscoveryCacheSettings();

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Discovery feed
          </p>
          <h1 className="mt-2 text-3xl font-bold">تخزين اكتشاف المطابخ</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            كاش بسيط في ذاكرة السيرفر لقائمة المنزل المرقّمة (بدون Redis).
            لا يغيّر قواعد التوفر عند الطلب — التحقق يبقى في اقتباس الدفع.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
            <Link
              href="/dashboard/admin/image-settings"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              إعدادات الصور
            </Link>
          </div>
        </header>
        <DiscoveryCacheForm initial={settings} />
      </div>
    </main>
  );
}
