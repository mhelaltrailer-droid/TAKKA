import { NextResponse } from "next/server";

import { sweepOverdueKitchenOrders } from "@/lib/kitchen-acceptance-sweep";

export async function GET() {
  // UptimeRobot already pings this about every 5 minutes. That ping keeps the
  // free Render service awake and is the scheduler for acceptance timeouts.
  await sweepOverdueKitchenOrders();

  return NextResponse.json({
    app: "tekka-admin",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
