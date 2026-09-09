import { AddressManager } from "@/components/address-manager";
import { AppShell } from "@/components/app-shell";
import { requireAppAccount } from "@/lib/app-gate";
import { db } from "@/lib/db";

export default async function AddressesPage() {
  const user = await requireAppAccount();

  const [addresses, unreadNotificationsCount] = await Promise.all([
    db.customerAddress.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        region: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
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
      title="إدارة العناوين"
      subtitle="أضف عناوينك، اختر الافتراضي، واحذف ما لا تحتاجه لتسهيل الطلبات."
    >
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
    </AppShell>
  );
}
