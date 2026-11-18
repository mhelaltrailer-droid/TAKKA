import { auth, clerkClient } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import sharp from "sharp";

import { db } from "@/lib/db";
import { putR2Object } from "@/lib/r2-client";
import {
  UploadValidationError,
  UPLOAD_PURPOSES,
  type UploadPurpose,
  buildObjectKey,
  isUploadPurpose,
} from "@/lib/r2-upload";
import { type AppRole, isAppRole } from "@/lib/roles";

const WEBP_QUALITY = 85;

export { UploadValidationError, UPLOAD_PURPOSES, isUploadPurpose };
export type { UploadPurpose };

function assertImageMimeType(mimeType: string) {
  // Empty MIME is allowed: some mobile clients omit it; sharp validates bytes.
  if (!mimeType) {
    return;
  }

  if (!mimeType.startsWith("image/")) {
    throw new UploadValidationError("يسمح برفع الصور فقط.");
  }
}

async function convertImageToWebp(file: File): Promise<File> {
  assertImageMimeType(file.type);

  const input = Buffer.from(await file.arrayBuffer());

  try {
    const meta = await sharp(input, { failOn: "error", animated: false }).metadata();
    if (!meta.format) {
      throw new Error("missing format");
    }
  } catch {
    throw new UploadValidationError("يسمح برفع الصور فقط.");
  }

  try {
    const webpBuffer = await sharp(input, { failOn: "error", animated: false })
      .rotate()
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    const baseName =
      file.name.replace(/\.[^.]+$/u, "").trim() || "image";

    return new File([new Uint8Array(webpBuffer)], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    throw new UploadValidationError("تعذر تحويل الصورة إلى WebP.");
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

export function asUploadFile(value: FormDataEntryValue | null): File | null {
  if (value instanceof File && value.size > 0) {
    return value;
  }

  // Some mobile multipart clients send Blob instead of File.
  if (value instanceof Blob && value.size > 0) {
    const type = value.type || "image/jpeg";
    return new File([value], "upload.jpg", {
      type,
      lastModified: Date.now(),
    });
  }

  return null;
}

export async function uploadImageFile(params: {
  file: File;
  purpose: UploadPurpose;
  role: AppRole;
  ownerId: string;
}) {
  const config = UPLOAD_PURPOSES[params.purpose];

  if (config.adminOnly && params.role !== "admin") {
    throw new UploadValidationError("غير مصرح برفع هذا الملف.");
  }

  if (params.file.size <= 0) {
    throw new UploadValidationError("الملف فارغ.");
  }

  if (params.file.size > config.maxBytes) {
    const maxMb = Math.round(config.maxBytes / (1024 * 1024));
    throw new UploadValidationError(
      `حجم الصورة أكبر من الحد المسموح (${maxMb}MB).`,
    );
  }

  // Accept any real image bytes, reject non-images, store as WebP.
  // Kept for older app builds that still POST the file to this server.
  const webpFile = await convertImageToWebp(params.file);
  const key = buildObjectKey({
    purpose: params.purpose,
    ownerId: params.ownerId,
    extension: "webp",
  });
  const body = Buffer.from(await webpFile.arrayBuffer());
  const stored = await putR2Object({
    key,
    body,
    contentType: "image/webp",
  });

  return {
    url: stored.url,
    key,
    purpose: params.purpose,
    contentType: "image/webp" as const,
  };
}
