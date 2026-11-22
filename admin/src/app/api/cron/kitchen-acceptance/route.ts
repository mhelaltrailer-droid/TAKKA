import { NextResponse } from "next/server";

import { sweepOverdueKitchenOrders } from "@/lib/kitchen-acceptance-sweep";

/**
 * Optional dedicated trigger for the same sweep /api/health already runs.
 * If CRON_SECRET is set, require it. The health ping does not use this secret
 * because the existing uptime monitor does not send one.
 */
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return true;
  }
  const header = request.headers.get("x-cron-secret")?.trim();
  const authorization = request.headers.get("authorization")?.trim();
  return header === secret || authorization === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await sweepOverdueKitchenOrders();
  return NextResponse.json({ ok: !result.failed, ...result });
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
