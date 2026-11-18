import { NextResponse } from "next/server";

import { getCurrentAppUser } from "@/lib/auth";
import { migrateUploadThingImages } from "@/lib/migrate-uploadthing-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "غير مصرح." }, { status: 403 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
      dryRun?: unknown;
      limit?: unknown;
    };

    // Missing or true stays a dry run. A real copy requires dryRun: false.
    const dryRun = payload.dryRun !== false;
    const limit =
      typeof payload.limit === "number" ? payload.limit : Number(payload.limit);

    const summary = await migrateUploadThingImages({
      dryRun,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json(summary);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر نقل الصور.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
