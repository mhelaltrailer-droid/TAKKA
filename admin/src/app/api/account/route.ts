import { NextResponse } from "next/server";

import {
  AccountDeletionError,
  permanentlyDeleteAccount,
} from "@/lib/account-deletion";
import { getCurrentAppUser } from "@/lib/auth";

export async function DELETE() {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولًا." },
        { status: 401 },
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "الحساب غير نشط." },
        { status: 403 },
      );
    }

    await permanentlyDeleteAccount({
      appUserId: user.appUserId,
      clerkUserId: user.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "تعذر حذف الحساب.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
