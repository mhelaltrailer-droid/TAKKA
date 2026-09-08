"use server";

import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

export async function markNotificationRead(formData: FormData) {
  const user = await requireAuth();
  const notificationId = getString(formData, "notificationId");

  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: user.appUserId,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead() {
  const user = await requireAuth();

  await db.notification.updateMany({
    where: {
      userId: user.appUserId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
