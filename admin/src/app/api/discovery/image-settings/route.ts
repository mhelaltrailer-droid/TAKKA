import { NextResponse } from "next/server";

import { getImageDisplaySettings } from "@/lib/image-display-settings";
import { IMAGE_DISPLAY_SETTINGS_DEFAULTS } from "@/lib/image-settings";

/**
 * Public config for display-time watermark + on-device enhancement flags.
 * Clients fall back to defaults if this fails.
 */
export async function GET() {
  try {
    const settings = await getImageDisplaySettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  } catch {
    return NextResponse.json(IMAGE_DISPLAY_SETTINGS_DEFAULTS, {
      headers: { "Cache-Control": "public, max-age=30" },
    });
  }
}
