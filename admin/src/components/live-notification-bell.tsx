"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getPusherClient, isPusherClientConfigured } from "@/lib/pusher-client";

type LiveNotificationBellProps = {
  userId: string;
  initialUnreadCount: number;
};

export function LiveNotificationBell({
  userId,
  initialUnreadCount,
}: LiveNotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    if (!isPusherClientConfigured) {
      return;
    }

    const client = getPusherClient();

    if (!client) {
      return;
    }

    const channel = client.subscribe(`user-${userId}`);
    const onNewNotification = () => {
      setUnreadCount((current) => current + 1);
    };

    channel.bind("notification:new", onNewNotification);

    return () => {
      channel.unbind("notification:new", onNewNotification);
      client.unsubscribe(`user-${userId}`);
    };
  }, [userId]);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
    >
      الإشعارات
      {unreadCount > 0 ? (
        <span className="ms-2 inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--brand-secondary)] px-2 py-0.5 text-xs text-white">
          {unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
