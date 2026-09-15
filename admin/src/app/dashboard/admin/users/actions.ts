"use server";

import { UserRole } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
} from "@/lib/phone";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function parseRole(value: string): UserRole {
  switch (value) {
    case "ADMIN":
      return UserRole.ADMIN;
    case "KITCHEN_OWNER":
      return UserRole.KITCHEN_OWNER;
    case "CUSTOMER":
      return UserRole.CUSTOMER;
    default:
      throw new Error("الدور غير صالح.");
  }
}

function toClerkRole(role: UserRole): "admin" | "kitchen_owner" | "customer" {
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

async function syncClerkRole(clerkUserId: string | null | undefined, role: UserRole) {
  if (!clerkUserId) return;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(clerkUserId);
    await clerk.users.updateUser(clerkUserId, {
      publicMetadata: {
        ...(typeof user.publicMetadata === "object" && user.publicMetadata
          ? user.publicMetadata
          : {}),
        role: toClerkRole(role),
      },
    });
  } catch {
    // Best-effort Clerk sync; DB remains source for app APIs after next login sync.
  }
}

export async function createAdminManagedUser(formData: FormData) {
  await requireRole(["admin"]);

  const fullName = getString(formData, "fullName");
  const email = getString(formData, "email").toLowerCase();
  const phoneRaw = getString(formData, "phoneNumber");
  const password = getString(formData, "password");
  const role = parseRole(getString(formData, "role"));

  if (!fullName) throw new Error("الاسم مطلوب.");
  if (!email) throw new Error("البريد الإلكتروني مطلوب.");
  if (!password || password.length < 8) {
    throw new Error("كلمة المرور يجب ألا تقل عن 8 أحرف.");
  }

  let phoneNumber: string | null = null;
  if (phoneRaw) {
    phoneNumber = normalizeEgyptianPhone(phoneRaw);
    if (!isValidEgyptianPhone(phoneNumber)) {
      throw new Error("رقم الهاتف غير صالح. يجب أن يبدأ بـ 01 ويكون 11 رقمًا.");
    }
  }

  const existing = await db.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    },
  });
  if (existing) {
    throw new Error("يوجد مستخدم بنفس البريد أو رقم الهاتف.");
  }

  const clerk = await clerkClient();
  const created = await clerk.users.createUser({
    emailAddress: [email],
    password,
    firstName: fullName.split(/\s+/)[0] || fullName,
    lastName: fullName.split(/\s+/).slice(1).join(" ") || undefined,
    publicMetadata: { role: toClerkRole(role) },
    skipPasswordChecks: true,
  });

  await db.user.create({
    data: {
      clerkUserId: created.id,
      fullName,
      email,
      phoneNumber,
      role,
      isActive: true,
    },
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
}

export async function updateAdminManagedUser(formData: FormData) {
  const admin = await requireRole(["admin"]);

  const userId = getString(formData, "userId");
  const fullName = getString(formData, "fullName");
  const phoneRaw = getString(formData, "phoneNumber");
  const role = parseRole(getString(formData, "role"));

  if (!userId) throw new Error("المستخدم مطلوب.");
  if (!fullName) throw new Error("الاسم مطلوب.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("المستخدم غير موجود.");

  if (target.id === admin.appUserId && role !== UserRole.ADMIN) {
    throw new Error("لا يمكنك إزالة دور الإدارة عن حسابك.");
  }

  let phoneNumber: string | null = null;
  if (phoneRaw) {
    phoneNumber = normalizeEgyptianPhone(phoneRaw);
    if (!isValidEgyptianPhone(phoneNumber)) {
      throw new Error("رقم الهاتف غير صالح. يجب أن يبدأ بـ 01 ويكون 11 رقمًا.");
    }
  }

  if (phoneNumber) {
    const phoneTaken = await db.user.findFirst({
      where: { phoneNumber, id: { not: userId } },
    });
    if (phoneTaken) {
      throw new Error("رقم الهاتف مستخدم لحساب آخر.");
    }
  }

  if (target.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
    const otherAdmins = await db.user.count({
      where: { role: UserRole.ADMIN, id: { not: userId }, isActive: true },
    });
    if (otherAdmins === 0) {
      throw new Error("لا يمكن إزالة آخر أدمن نشط في النظام.");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      fullName,
      phoneNumber,
      role,
    },
  });

  await syncClerkRole(target.clerkUserId, role);

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
}

export async function toggleAdminManagedUserActive(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const userId = getString(formData, "userId");
  if (!userId) throw new Error("المستخدم مطلوب.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("المستخدم غير موجود.");

  if (target.id === admin.appUserId) {
    throw new Error("لا يمكنك تعطيل حسابك.");
  }

  if (target.isActive && target.role === UserRole.ADMIN) {
    const otherAdmins = await db.user.count({
      where: { role: UserRole.ADMIN, id: { not: userId }, isActive: true },
    });
    if (otherAdmins === 0) {
      throw new Error("لا يمكن تعطيل آخر أدمن نشط.");
    }
  }

  await db.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });

  if (target.clerkUserId) {
    try {
      const clerk = await clerkClient();
      if (target.isActive) {
        await clerk.users.banUser(target.clerkUserId);
      } else {
        await clerk.users.unbanUser(target.clerkUserId);
      }
    } catch {
      // Best-effort
    }
  }

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
}

export async function deleteAdminManagedUser(formData: FormData) {
  const admin = await requireRole(["admin"]);
  const userId = getString(formData, "userId");
  if (!userId) throw new Error("المستخدم مطلوب.");

  const target = await db.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { kitchens: true, customerOrders: true } } },
  });
  if (!target) throw new Error("المستخدم غير موجود.");

  if (target.id === admin.appUserId) {
    throw new Error("لا يمكنك حذف حسابك.");
  }

  if (target.role === UserRole.ADMIN) {
    const otherAdmins = await db.user.count({
      where: { role: UserRole.ADMIN, id: { not: userId }, isActive: true },
    });
    if (otherAdmins === 0) {
      throw new Error("لا يمكن حذف آخر أدمن نشط.");
    }
  }

  if (target._count.kitchens > 0 || target._count.customerOrders > 0) {
    throw new Error(
      "لا يمكن حذف مستخدم مرتبط بمطبخ أو طلبات. عطّل الحساب بدلاً من الحذف.",
    );
  }

  if (target.clerkUserId) {
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(target.clerkUserId);
    } catch {
      // Continue with DB delete even if Clerk user already gone
    }
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
}
