import { NotificationType } from "@prisma/client";

import { db } from "@/lib/db";
import { sendNotificationPush } from "@/lib/push";
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

  let pusherError: unknown;
  try {
    await triggerUserEvent(userId, "notification:new", {
      id: notification.id,
      orderId: notification.orderId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      isRead: notification.isRead,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch (error) {
    pusherError = error;
  }

  await sendNotificationPush({
    userId,
    notificationId: notification.id,
    orderId: notification.orderId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
  });

  if (pusherError) {
    throw pusherError;
  }

  return notification;
}
