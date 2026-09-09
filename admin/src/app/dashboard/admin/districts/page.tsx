import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { listAllObourDistricts } from "@/lib/districts";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";

import { DistrictManager } from "./district-manager";

export default async function AdminDistrictsPage() {
  await requireRole(["admin"]);
  const districts = await listAllObourDistricts();

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Service Areas
          </p>
          <h1 className="mt-2 text-3xl font-bold">إدارة أحياء مدينة العبور</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            أضف أو عدّل أو احذف الأحياء التي تظهر في قائمة اختيار الموقع للعميل
            والمطبخ على الويب والتطبيق.
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

        <DistrictManager
          cityName={OBOUR_CITY_NAME}
          initialDistricts={districts}
        />
      </div>
    </main>
  );
}
