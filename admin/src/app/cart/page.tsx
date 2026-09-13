import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { WebCartCheckout } from "@/components/web-cart-checkout";
import { requireAppAccount } from "@/lib/app-gate";
import { db } from "@/lib/db";

export default async function CartPage() {
  const user = await requireAppAccount();

  const [addresses, appUser, unreadNotificationsCount] = await Promise.all([
    db.customerAddress.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        region: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    db.user.findUnique({
      where: { id: user.appUserId },
      select: { phoneNumber: true },
    }),
    db.notification.count({
      where: {
        userId: user.appUserId,
        isRead: false,
      },
    }),
  ]);

  return (
    <AppShell
      mode="customer"
      userId={user.appUserId}
      unreadNotificationsCount={unreadNotificationsCount}
      title="السلة ومراجعة الطلب"
      subtitle="راجع أصنافك، اختر طريقة الاستلام، ثم أرسل الطلب."
      activeNav="orders"
    >
      <div className="mb-6">
        <Link
          href="/kitchens"
          className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
        >
          العودة للمطابخ
        </Link>
      </div>

      <WebCartCheckout
        registeredPhone={appUser?.phoneNumber ?? null}
        addresses={addresses.map((address) => ({
          id: address.id,
          label: address.label,
          addressLine: address.addressLine,
          latitude: address.latitude,
          longitude: address.longitude,
          region: {
            cityName: address.region.cityName,
            regionName: address.region.regionName,
          },
        }))}
      />
    </AppShell>
  );
}
