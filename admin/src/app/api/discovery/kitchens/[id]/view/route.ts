import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";
import { formatDateKey } from "@/lib/kitchen-order-stats";

type ViewPayload = {
  sessionKey?: string;
};

/**
 * Public: record a kitchen browse visit (guest or signed-in).
 * Deduped to one event per kitchen + sessionKey + calendar day.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const payload = (await request.json().catch(() => ({}))) as ViewPayload;
    const sessionKey = payload.sessionKey?.trim() ?? "";

    if (!sessionKey || sessionKey.length < 8 || sessionKey.length > 128) {
      return NextResponse.json(
        { error: "معرّف الجلسة غير صالح." },
        { status: 400 },
      );
    }

    const kitchen = await db.kitchen.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        approvalStatus: "APPROVED",
      },
      select: { id: true },
    });

    if (!kitchen) {
      return NextResponse.json({ error: "المطبخ غير موجود." }, { status: 404 });
    }

    let viewerUserId: string | null = null;
    try {
      const { userId } = await auth({ acceptsToken: "session_token" });
      if (userId) {
        const appUser = await db.user.findUnique({
          where: { clerkUserId: userId },
          select: { id: true },
        });
        viewerUserId = appUser?.id ?? null;
      }
    } catch {
      // Public browse — ignore auth failures
    }

    const viewDay = formatDateKey(new Date());

    await db.kitchenViewEvent.upsert({
      where: {
        kitchenId_sessionKey_viewDay: {
          kitchenId: kitchen.id,
          sessionKey,
          viewDay,
        },
      },
      create: {
        kitchenId: kitchen.id,
        sessionKey,
        viewDay,
        viewerUserId,
      },
      update: {
        ...(viewerUserId ? { viewerUserId } : {}),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تسجيل المشاهدة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
