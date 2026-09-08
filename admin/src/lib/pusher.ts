import Pusher from "pusher";

export const isPusherConfigured = Boolean(
  process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    !process.env.PUSHER_APP_ID.includes("replace_me"),
);

export const pusherServer = isPusherConfigured
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID ?? "",
      key: process.env.NEXT_PUBLIC_PUSHER_KEY ?? "",
      secret: process.env.PUSHER_SECRET ?? "",
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "eu",
      useTLS: true,
    })
  : null;

export async function triggerOrderEvent(
  orderId: string,
  eventName: string,
  payload: Record<string, unknown>,
) {
  if (!pusherServer) {
    return;
  }

  await pusherServer.trigger(`order-${orderId}`, eventName, payload);
}

export async function triggerUserEvent(
  userId: string,
  eventName: string,
  payload: Record<string, unknown>,
) {
  if (!pusherServer) {
    return;
  }

  await pusherServer.trigger(`user-${userId}`, eventName, payload);
}
