import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { isAppRole } from "@/lib/roles";
import { syncAppUserFromClerkData } from "@/lib/auth";

export async function GET() {
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
  const user = await syncAppUserFromClerkData({
    clerkUserId: userId,
    fullName,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber ?? null,
    roleFromMetadata: isAppRole(rawRole) ? rawRole : null,
  });

  return NextResponse.json({
    user,
  });
}
