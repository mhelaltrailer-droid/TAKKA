"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getPusherClient, isPusherClientConfigured } from "@/lib/pusher-client";

type LiveRefreshListenerProps = {
  channelName: string;
  eventNames: string[];
};

export function LiveRefreshListener({
  channelName,
  eventNames,
}: LiveRefreshListenerProps) {
  const router = useRouter();

  useEffect(() => {
    if (!isPusherClientConfigured) {
      return;
    }

    const client = getPusherClient();

    if (!client) {
      return;
    }

    const channel = client.subscribe(channelName);
    const refresh = () => router.refresh();

    for (const eventName of eventNames) {
      channel.bind(eventName, refresh);
    }

    return () => {
      for (const eventName of eventNames) {
        channel.unbind(eventName, refresh);
      }

      client.unsubscribe(channelName);
    };
  }, [channelName, eventNames, router]);

  return null;
}
