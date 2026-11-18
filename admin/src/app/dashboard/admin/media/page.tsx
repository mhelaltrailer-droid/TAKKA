import Link from "next/link";

import { requireRole } from "@/lib/auth";

import { MediaMigrationPanel } from "./media-migration-panel";

export default async function AdminMediaPage() {
  await requireRole(["admin"]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Media
          </p>
          <h1 className="mt-2 text-3xl font-bold">نقل صور الملفات</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            انقل الصور المستضافة على UploadThing إلى Cloudflare R2 بعد ضبط
            متغيرات R2 على الخادم. ابدأ بالمعاينة، ثم نفّذ الدفعات حتى تنتهي.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              العودة للوحة الإدارة
            </Link>
          </div>
        </header>

        <MediaMigrationPanel />
      </div>
    </main>
  );
}
