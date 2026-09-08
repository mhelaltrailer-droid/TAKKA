import { NotificationType } from "@prisma/client";

import { db } from "@/lib/db";
import { triggerUserEvent } from "@/lib/pusher";

type CreateNotificationInput = {
  userId: string;
  orderId?: string;
  type: NotificationType;
  title: string;
  body: string;
};

export async function createNotification({
  userId,
  orderId,
  type,
  title,
  body,
}: CreateNotificationInput) {
  const notification = await db.notification.create({
    data: {
      userId,
      orderId: orderId ?? null,
      type,
      title,
      body,
    },
  });

  await triggerUserEvent(userId, "notification:new", {
    id: notification.id,
    orderId: notification.orderId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
  });

  return notification;
}
