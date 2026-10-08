import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  AccountDeletionError,
  permanentlyDeleteAccount,
} from "@/lib/account-deletion";
import { isAppRole } from "@/lib/roles";
import { syncAppUserFromClerkData } from "@/lib/auth";

export async function DELETE() {
  try {
    const { userId } = await auth({ acceptsToken: "session_token" });
    if (!userId) {
      return NextResponse.json(
        {
          error: "UNAUTHENTICATED",
          message: "يجب تسجيل الدخول أولًا.",
        },
        { status: 401 },
      );
    }

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const rawRole = clerkUser.publicMetadata?.role;
    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "مستخدم جديد";
    const metadataPhone =
      typeof clerkUser.publicMetadata?.egyptianPhone === "string"
        ? clerkUser.publicMetadata.egyptianPhone
        : typeof clerkUser.unsafeMetadata?.egyptianPhone === "string"
          ? clerkUser.unsafeMetadata.egyptianPhone
          : null;

    const user = await syncAppUserFromClerkData({
      clerkUserId: userId,
      fullName,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      phoneNumber:
        clerkUser.primaryPhoneNumber?.phoneNumber ?? metadataPhone,
      roleFromMetadata: isAppRole(rawRole) ? rawRole : null,
    });

    if (!user.isActive) {
      return NextResponse.json(
        { error: "الحساب غير نشط.", message: "الحساب غير نشط." },
        { status: 403 },
      );
    }

    await permanentlyDeleteAccount({
      appUserId: user.appUserId,
      clerkUserId: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AccountDeletionError) {
      return NextResponse.json(
        { error: error.message, message: error.message },
        { status: error.status },
      );
    }
    const message =
      error instanceof Error ? error.message : "تعذر حذف الحساب.";
    return NextResponse.json(
      { error: message, message },
      { status: 500 },
    );
  }
}
