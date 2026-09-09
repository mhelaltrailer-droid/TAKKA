import { AppShell } from "@/components/app-shell";
import { requireAppAccount } from "@/lib/app-gate";
import { db } from "@/lib/db";

import { MyOrdersClient } from "./my-orders-client";

export default async function MyOrdersPage() {
  const user = await requireAppAccount();

  const [orders, unreadNotificationsCount] = await Promise.all([
    db.order.findMany({
      where: {
        customerId: user.appUserId,
      },
      include: {
        kitchen: {
          select: {
            kitchenName: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
      title="طلباتك"
      subtitle="النشطة: قيد التنفيذ · السابقة: مكتملة أو ملغاة"
      activeNav="orders"
    >
      <MyOrdersClient
        orders={orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          deliveryType: order.deliveryType,
          totalAmount: Number(order.totalAmount),
          kitchenName: order.kitchen.kitchenName,
          itemsCount: order.items.length,
          createdAtLabel: order.createdAt.toLocaleString("ar-EG"),
        }))}
      />
    </AppShell>
  );
}
