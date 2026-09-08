import Link from "next/link";
import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";

import { CustomerOrderForm } from "@/components/customer-order-form";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function KitchenOrderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requireAuth();
  const { slug } = await params;

  const [kitchen, addresses] = await Promise.all([
    db.kitchen.findFirst({
      where: {
        slug,
        approvalStatus: ApprovalStatus.APPROVED,
        availabilityStatus: AvailabilityStatus.OPEN,
      },
      include: {
        menuItems: {
          where: {
            isAvailable: true,
          },
          include: {
            sizes: {
              where: {
                isActive: true,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    }),
    db.customerAddress.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        region: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  if (!kitchen) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">المطبخ غير متاح للطلب الآن</h1>
          <Link
            href="/kitchens"
            className="mt-4 inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            العودة للمطابخ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Link
            href={`/kitchens/${kitchen.slug}`}
            className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
          >
            العودة لتفاصيل المطبخ
          </Link>
          <h1 className="mt-3 text-3xl font-bold">طلب من {kitchen.kitchenName}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            هذه أول واجهة عميل عملية لإنشاء الطلب مباشرة من المنيو وربطه بـ API
            الطلبات الحالية.
          </p>
        </header>

        <CustomerOrderForm
          kitchenId={kitchen.id}
          menuItems={kitchen.menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            basePrice: String(item.basePrice),
            depositAmount: String(item.depositAmount),
            sizes: item.sizes.map((size) => ({
              id: size.id,
              sizeName: size.sizeName,
              price: String(size.price),
              depositAmount: size.depositAmount
                ? String(size.depositAmount)
                : null,
            })),
          }))}
          addresses={addresses.map((address) => ({
            id: address.id,
            label: address.label,
            addressLine: address.addressLine,
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
