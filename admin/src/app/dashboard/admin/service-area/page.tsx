import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getServiceArea } from "@/lib/service-area-store";

import { ServiceAreaForm } from "./service-area-form";

export default async function AdminServiceAreaPage() {
  await requireRole(["admin"]);
  const area = await getServiceArea();

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Delivery service area
          </p>
          <h1 className="mt-2 text-3xl font-bold">نطاق التوصيل</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            مركز الدائرة ونصف قطرها ورسالة الرفض متخزنة في قاعدة البيانات.
            عرض السعر وإنشاء الطلب وحفظ العنوان يرفضون أي نقطة خارج هذا النطاق.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              لوحة الإدارة
            </Link>
          </div>
        </header>
        <ServiceAreaForm initial={area} />
      </div>
    </main>
  );
}
