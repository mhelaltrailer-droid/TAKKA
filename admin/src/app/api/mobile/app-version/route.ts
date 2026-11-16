import { connection, NextResponse } from "next/server";

import { resolveMobileAppVersion } from "@/lib/mobile-app-version";
import { resolveSupportWhatsappNumber } from "@/lib/support-whatsapp";

let didWarn = false;

/**
 * Public on purpose: the sideloaded app calls this before sign-in.
 * Clerk middleware already skips /api/mobile. Missing update env vars return
 * configured:false so the update prompt stays silent.
 * supportWhatsappNumber is always present (SUPPORT_WHATSAPP_NUMBER or the
 * Takka default). The app opens WhatsApp itself; this route sends nothing.
 */
export async function GET() {
  await connection();
  const payload = {
    ...resolveMobileAppVersion(process.env),
    supportWhatsappNumber: resolveSupportWhatsappNumber(process.env),
  };
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
