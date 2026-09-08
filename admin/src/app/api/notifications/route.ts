import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuth();

    const notifications = await db.notification.findMany({
      where: {
        userId: user.appUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل الإشعارات.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
