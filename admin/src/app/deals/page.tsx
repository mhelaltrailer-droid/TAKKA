import { AppShell } from "@/components/app-shell";
import { auth } from "@clerk/nextjs/server";

import { DealsBrowseClient } from "./deals-browse-client";

export default async function DealsPage() {
  const { userId } = await auth();

  return (
    <AppShell
      mode="customer"
      activeNav="deals"
      userId={userId ?? undefined}
    >
      <DealsBrowseClient />
    </AppShell>
  );
}
