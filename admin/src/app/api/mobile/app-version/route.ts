import { connection, NextResponse } from "next/server";

import { resolveMobileAppVersion } from "@/lib/mobile-app-version";

let didWarn = false;

/**
 * Public on purpose: the sideloaded app calls this before sign-in.
 * Clerk middleware already skips /api/mobile. Missing env vars return
 * configured:false so the app can stay silent.
 */
export async function GET() {
  await connection();
  const payload = resolveMobileAppVersion(process.env);
  if (!payload.configured && !didWarn) {
    didWarn = true;
    console.warn(`[mobile-app-version] ${payload.reason}`);
  }

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
