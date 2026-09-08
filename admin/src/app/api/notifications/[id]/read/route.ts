import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const notification = await db.notification.updateMany({
      where: {
        id,
        userId: user.appUserId,
      },
      data: {
        isRead: true,
      },
    });

    if (!notification.count) {
      return NextResponse.json(
        { error: "الإشعار غير موجود." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث الإشعار.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
