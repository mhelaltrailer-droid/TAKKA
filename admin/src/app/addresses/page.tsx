import Link from "next/link";

import { AddressManager } from "@/components/address-manager";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AddressesPage() {
  const user = await requireAuth();

  const addresses = await db.customerAddress.findMany({
    where: {
      customerId: user.appUserId,
    },
    include: {
      region: true,
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
          >
            العودة إلى اللوحة
          </Link>
          <h1 className="mt-3 text-3xl font-bold">إدارة العناوين</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            من هنا يستطيع العميل إضافة عناوينه، اختيار عنوان افتراضي، وحذف
            العناوين غير المطلوبة لتسهيل الطلبات المستقبلية.
          </p>
        </header>

        <AddressManager
          initialAddresses={addresses.map((address) => ({
            id: address.id,
            label: address.label,
            cityName: address.cityName,
            addressLine: address.addressLine,
            landmark: address.landmark,
            isDefault: address.isDefault,
            region: {
              cityName: address.region.cityName,
              regionName: address.region.regionName,
            },
          }))}
        />
      </div>
    </main>
  );
}
