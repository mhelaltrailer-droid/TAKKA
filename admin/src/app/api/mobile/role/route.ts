import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { syncAppUserFromClerkData } from "@/lib/auth";

const bodySchema = z.object({
  role: z.enum(["customer", "kitchen_owner"]),
});

function toDatabaseRole(role: "customer" | "kitchen_owner") {
  return role === "kitchen_owner" ? UserRole.KITCHEN_OWNER : UserRole.CUSTOMER;
}

export async function POST(request: NextRequest) {
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

  const parsed = bodySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "INVALID_ROLE",
        message: "الدور المرسل غير صالح.",
      },
      { status: 400 },
    );
  }

  const role = parsed.data.role;
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    "مستخدم جديد";
  const syncedUser = await syncAppUserFromClerkData({
    clerkUserId: userId,
    fullName,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber ?? null,
    roleFromMetadata: role,
  });

  await db.user.update({
    where: {
      id: syncedUser.appUserId,
    },
    data: {
      role: toDatabaseRole(role),
    },
  });

  await clerk.users.updateUserMetadata(userId, {
    publicMetadata: {
      role,
    },
  });

  return NextResponse.json({
    success: true,
    role,
  });
}
