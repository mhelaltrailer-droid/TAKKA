import { NotificationType } from "@prisma/client";

import { db } from "@/lib/db";
import {
  TAKKA_PUSH_CHANNEL_ID,
  isStaleFcmTokenError,
  pushDestination,
  readFirebaseServiceAccount,
} from "@/lib/push-message";

const MULTICAST_LIMIT = 500;

type MessagingClient = {
  sendEachForMulticast: (message: {
    tokens: string[];
    notification: { title: string; body: string };
    data: Record<string, string>;
    android: {
      priority: "high";
      notification: {
        channelId: string;
        sound: string;
        priority: "high";
        defaultSound: boolean;
      };
    };
  }) => Promise<{
    responses: Array<{
      success: boolean;
      error?: { code?: string; message?: string };
    }>;
  }>;
};

let messagingClient: MessagingClient | null = null;

async function getMessagingClient(): Promise<MessagingClient | null> {
  if (messagingClient) {
    return messagingClient;
  }

  const account = readFirebaseServiceAccount();
  if (!account) {
    return null;
  }

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getMessaging } = await import("firebase-admin/messaging");

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: account.projectId,
        clientEmail: account.clientEmail,
        privateKey: account.privateKey,
      }),
    });
  }

  messagingClient = getMessaging();
  return messagingClient;
}

type SendNotificationPushInput = {
  userId: string;
  notificationId: string;
  orderId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
};

/**
 * Sends an FCM notification for an in-app notification that was already stored.
 * Missing Firebase config, missing tokens, and send errors are ignored so the
 * existing Pusher + database notification still succeeds.
 */
export async function sendNotificationPush(input: SendNotificationPushInput) {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!readFirebaseServiceAccount()) {
    if (rawJson) {
      console.error(
        "[fcm] FIREBASE_SERVICE_ACCOUNT_JSON is set but is not a usable service account. Push skipped.",
      );
    }
    return;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: input.userId },
      select: {
        role: true,
        devicePushTokens: {
          select: { token: true },
        },
      },
    });

    const tokens = user?.devicePushTokens.map((row) => row.token) ?? [];
    if (!user || tokens.length === 0) {
      return;
    }

    const messaging = await getMessagingClient();
    if (!messaging) {
      return;
    }

    const destination = pushDestination({
      role: user.role,
      type: input.type,
      orderId: input.orderId,
    });

    const data = {
      audience: destination.audience,
      route: destination.route,
      orderId: input.orderId ?? "",
      type: input.type,
      notificationId: input.notificationId,
      title: input.title,
      body: input.body,
    };

    const stale: string[] = [];
    for (let index = 0; index < tokens.length; index += MULTICAST_LIMIT) {
      const chunk = tokens.slice(index, index + MULTICAST_LIMIT);
      const response = await messaging.sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: input.title,
          body: input.body,
        },
        data,
        android: {
          priority: "high",
          notification: {
            channelId: TAKKA_PUSH_CHANNEL_ID,
            sound: "default",
            priority: "high",
            defaultSound: true,
          },
        },
      });

      response.responses.forEach((item, itemIndex) => {
        if (item.success) {
          return;
        }
        const code = item.error?.code;
        const message = item.error?.message;
        if (isStaleFcmTokenError(code, message)) {
          const token = chunk[itemIndex];
          if (token) {
            stale.push(token);
          }
          return;
        }
        console.error("[fcm] send failed", code ?? "unknown");
      });
    }

    if (stale.length > 0) {
      await db.devicePushToken.deleteMany({
        where: { token: { in: stale } },
      });
    }
  } catch (error) {
    console.error("[fcm] notification push skipped", error);
  }
}
