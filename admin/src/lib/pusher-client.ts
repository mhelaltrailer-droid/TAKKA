"use client";

import Pusher from "pusher-js";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

export const isPusherClientConfigured = Boolean(
  key && cluster && !key.includes("replace_me"),
);

let pusherClient: Pusher | null = null;

export function getPusherClient() {
  if (!isPusherClientConfigured) {
    return null;
  }

  if (!pusherClient) {
    pusherClient = new Pusher(key!, {
      cluster: cluster ?? "eu",
    });
  }

  return pusherClient;
}
