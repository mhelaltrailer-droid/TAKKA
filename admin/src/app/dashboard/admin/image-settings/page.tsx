import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getImageDisplaySettings } from "@/lib/image-display-settings";

import { ImageSettingsForm } from "./image-settings-form";

export default async function AdminImageSettingsPage() {
  await requireRole(["admin"]);
  const settings = await getImageDisplaySettings();

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Image pipeline
          </p>
          <h1 className="mt-2 text-3xl font-bold">إعدادات الصور</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            ضغط موحّد (حافة طويلة ≤ 1280، جودة ~75)، قص نسب ثابتة للطعام
            (صنف 4:3، غلاف 16:9، لوجو 1:1)، وتحسين خفيف على الموبايل فقط.
            العلامة المائية عند العرض فقط.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
            <Link
              href="/dashboard/admin/media"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              وسائط R2
            </Link>
          </div>
        </header>
        <ImageSettingsForm initial={settings} />
      </div>
    </main>
  );
}
