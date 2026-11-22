import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { acknowledgeKitchenSuspension } from "@/lib/kitchen-suspension";

export async function POST() {
  try {
    const user = await requireAuth();
    const result = await acknowledgeKitchenSuspension(user.appUserId);

    if (!result.found) {
      return NextResponse.json(
        { error: "لا يوجد مطبخ مرتبط بحسابك." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      suspended: result.requiresAdmin,
      cleared: result.cleared,
      requiresAdmin: result.requiresAdmin,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تأكيد قراءة التنبيه.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
