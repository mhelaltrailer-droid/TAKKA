import { UserRole } from "@prisma/client";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { type AppRole, isAppRole } from "@/lib/roles";
import { db } from "@/lib/db";

function toDatabaseRole(role: AppRole | null): UserRole {
  switch (role) {
    case "admin":
      return UserRole.ADMIN;
    case "kitchen_owner":
      return UserRole.KITCHEN_OWNER;
    case "customer":
    default:
      return UserRole.CUSTOMER;
  }
}

function fromDatabaseRole(role: UserRole): AppRole {
  switch (role) {
    case UserRole.ADMIN:
      return "admin";
    case UserRole.KITCHEN_OWNER:
      return "kitchen_owner";
    case UserRole.CUSTOMER:
    default:
      return "customer";
  }
}

type SyncAppUserInput = {
  clerkUserId: string;
  fullName: string;
  email: string | null;
  phoneNumber: string | null;
  roleFromMetadata: AppRole | null;
};

export async function syncAppUserFromClerkData({
  clerkUserId,
  fullName,
  email,
  phoneNumber,
  roleFromMetadata,
}: SyncAppUserInput) {
  const existingAppUser = await db.user.findUnique({
    where: {
      clerkUserId,
    },
    select: {
      id: true,
      role: true,
    },
  });
  const effectiveRole =
    roleFromMetadata ??
    (existingAppUser ? fromDatabaseRole(existingAppUser.role) : "customer");

  const appUser = await db.user.upsert({
    where: {
      clerkUserId,
    },
    update: {
      fullName,
      role: toDatabaseRole(effectiveRole),
      email,
      phoneNumber,
    },
    create: {
      clerkUserId,
      fullName,
      email,
      phoneNumber,
      role: toDatabaseRole(effectiveRole),
    },
  });

  const resolvedRole = fromDatabaseRole(appUser.role);
  const needsRoleSetup =
    roleFromMetadata == null && resolvedRole !== "admin";

  return {
    userId: clerkUserId,
    appUserId: appUser.id,
    email: appUser.email,
    fullName: appUser.fullName,
    phoneNumber: appUser.phoneNumber,
    role: resolvedRole,
    roleFromMetadata,
    needsRoleSetup,
  };
}

export async function getCurrentAppUser() {
  const { userId } = await auth({ acceptsToken: "session_token" });

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return null;
  }

  const rawRole = user.publicMetadata?.role;
  const roleFromMetadata = isAppRole(rawRole) ? rawRole : null;
  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    "مستخدم جديد";
  const email = user.primaryEmailAddress?.emailAddress ?? null;
  const metadataPhone =
    typeof user.publicMetadata?.egyptianPhone === "string"
      ? user.publicMetadata.egyptianPhone
      : typeof user.unsafeMetadata?.egyptianPhone === "string"
        ? user.unsafeMetadata.egyptianPhone
        : null;

  return syncAppUserFromClerkData({
    clerkUserId: userId,
    fullName,
    email,
    phoneNumber: user.primaryPhoneNumber?.phoneNumber ?? metadataPhone,
    roleFromMetadata,
  });
}

export async function requireAuth() {
  const user = await getCurrentAppUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireRole(allowedRoles: AppRole[]) {
  const user = await requireAuth();

  if (!user.role || !allowedRoles.includes(user.role)) {
    redirect("/forbidden");
  }

  return user;
}
