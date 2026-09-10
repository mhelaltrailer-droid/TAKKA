import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { UTApi } from "uploadthing/server";

import { db } from "@/lib/db";
import { type AppRole, isAppRole } from "@/lib/roles";

const utapi = new UTApi();

export const UPLOAD_PURPOSES = {
  kitchenLogo: { maxBytes: 4 * 1024 * 1024, adminOnly: false },
  kitchenCover: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  kitchenDocument: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  menuItemImage: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  depositProofImage: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  chatImage: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  promoBannerImage: { maxBytes: 8 * 1024 * 1024, adminOnly: true },
} as const;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

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

function toDatabaseRole(role: AppRole): UserRole {
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

/** API auth for uploads — supports cookie sessions and Bearer session tokens. Never redirects. */
export async function requireUploadApiUser() {
  const { userId } = await auth({ acceptsToken: "session_token" });

  if (!userId) {
    return null;
  }

  let appUser = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true },
  });

  if (!appUser) {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const rawRole = clerkUser.publicMetadata?.role;
    const role = isAppRole(rawRole) ? rawRole : "customer";
    const fullName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      clerkUser.username ||
      "مستخدم جديد";

    appUser = await db.user.create({
      data: {
        clerkUserId: userId,
        fullName,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
        phoneNumber: clerkUser.primaryPhoneNumber?.phoneNumber ?? null,
        role: toDatabaseRole(role),
      },
      select: { id: true, role: true },
    });
  }

  return {
    clerkUserId: userId,
    appUserId: appUser.id,
    role: fromDatabaseRole(appUser.role),
  };
}

export function isUploadPurpose(value: string): value is UploadPurpose {
  return value in UPLOAD_PURPOSES;
}

export async function uploadImageFile(params: {
  file: File;
  purpose: UploadPurpose;
  role: AppRole;
}) {
  const config = UPLOAD_PURPOSES[params.purpose];

  if (config.adminOnly && params.role !== "admin") {
    throw new Error("غير مصرح برفع هذا الملف.");
  }

  if (!params.file.type.startsWith("image/")) {
    throw new Error("يسمح برفع الصور فقط.");
  }

  if (params.file.size <= 0) {
    throw new Error("الملف فارغ.");
  }

  if (params.file.size > config.maxBytes) {
    const maxMb = Math.round(config.maxBytes / (1024 * 1024));
    throw new Error(`حجم الصورة أكبر من الحد المسموح (${maxMb}MB).`);
  }

  const result = await utapi.uploadFiles(params.file);

  if (result.error) {
    throw new Error(result.error.message || "فشل رفع الصورة.");
  }

  const url = result.data.ufsUrl || result.data.url;
  if (!url) {
    throw new Error("اكتمل الرفع لكن لم يُرجع رابط الصورة.");
  }

  return {
    url,
    key: result.data.key,
    purpose: params.purpose,
  };
}
