"use server";

import { UserRole } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
} from "@/lib/phone";

export type AdminUserActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

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

function fail(error: string): AdminUserActionResult {
  return { ok: false, error };
}

function ok(): AdminUserActionResult {
  return { ok: true };
}

function revalidateUsers() {
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin");
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
    // Best-effort
  }
}

async function setClerkBanned(clerkUserId: string | null | undefined, banned: boolean) {
  if (!clerkUserId) return;
  try {
    const clerk = await clerkClient();
    if (banned) {
      await clerk.users.banUser(clerkUserId);
    } else {
      await clerk.users.unbanUser(clerkUserId);
    }
  } catch {
    // Best-effort — DB isActive is source of truth for app access
  }
}

export async function createAdminManagedUser(
  formData: FormData,
): Promise<AdminUserActionResult> {
  try {
    await requireRole(["admin"]);

    const fullName = getString(formData, "fullName");
    const email = getString(formData, "email").toLowerCase();
    const phoneRaw = getString(formData, "phoneNumber");
    const password = getString(formData, "password");
    const role = parseRole(getString(formData, "role"));

    if (!fullName) return fail("الاسم مطلوب.");
    if (!email) return fail("البريد الإلكتروني مطلوب.");
    if (!password || password.length < 8) {
      return fail("كلمة المرور يجب ألا تقل عن 8 أحرف.");
    }

    let phoneNumber: string | null = null;
    if (phoneRaw) {
      phoneNumber = normalizeEgyptianPhone(phoneRaw);
      if (!isValidEgyptianPhone(phoneNumber)) {
        return fail("رقم الهاتف غير صالح. يجب أن يبدأ بـ 01 ويكون 11 رقمًا.");
      }
    }

    const existing = await db.user.findFirst({
      where: {
        OR: [{ email }, ...(phoneNumber ? [{ phoneNumber }] : [])],
      },
    });
    if (existing) {
      return fail("يوجد مستخدم بنفس البريد أو رقم الهاتف.");
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

    revalidateUsers();
    return ok();
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error ? error.message : "تعذر إنشاء المستخدم.";
    return fail(message);
  }
}

export async function updateAdminManagedUser(
  formData: FormData,
): Promise<AdminUserActionResult> {
  try {
    const admin = await requireRole(["admin"]);

    const userId = getString(formData, "userId");
    const fullName = getString(formData, "fullName");
    const phoneRaw = getString(formData, "phoneNumber");
    const role = parseRole(getString(formData, "role"));

    if (!userId) return fail("المستخدم مطلوب.");
    if (!fullName) return fail("الاسم مطلوب.");

    const target = await db.user.findUnique({ where: { id: userId } });
    if (!target) return fail("المستخدم غير موجود.");

    if (target.id === admin.appUserId && role !== UserRole.ADMIN) {
      return fail("لا يمكنك إزالة دور الإدارة عن حسابك.");
    }

    let phoneNumber: string | null = null;
    if (phoneRaw) {
      phoneNumber = normalizeEgyptianPhone(phoneRaw);
      if (!isValidEgyptianPhone(phoneNumber)) {
        return fail("رقم الهاتف غير صالح. يجب أن يبدأ بـ 01 ويكون 11 رقمًا.");
      }
    }

    if (phoneNumber) {
      const phoneTaken = await db.user.findFirst({
        where: { phoneNumber, id: { not: userId } },
      });
      if (phoneTaken) {
        return fail("رقم الهاتف مستخدم لحساب آخر.");
      }
    }

    if (target.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const otherAdmins = await db.user.count({
        where: { role: UserRole.ADMIN, id: { not: userId }, isActive: true },
      });
      if (otherAdmins === 0) {
        return fail("لا يمكن إزالة آخر أدمن نشط في النظام.");
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
    revalidateUsers();
    return ok();
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error ? error.message : "تعذر تحديث المستخدم.";
    return fail(message);
  }
}

export async function toggleAdminManagedUserActive(
  userId: string,
): Promise<AdminUserActionResult> {
  try {
    const admin = await requireRole(["admin"]);
    const id = userId.trim();
    if (!id) return fail("المستخدم مطلوب.");

    const target = await db.user.findUnique({ where: { id } });
    if (!target) return fail("المستخدم غير موجود.");

    if (target.id === admin.appUserId) {
      return fail("لا يمكنك تعطيل حسابك.");
    }

    if (target.isActive && target.role === UserRole.ADMIN) {
      const otherAdmins = await db.user.count({
        where: { role: UserRole.ADMIN, id: { not: id }, isActive: true },
      });
      if (otherAdmins === 0) {
        return fail("لا يمكن تعطيل آخر أدمن نشط.");
      }
    }

    const nextActive = !target.isActive;
    await db.user.update({
      where: { id },
      data: { isActive: nextActive },
    });
    await setClerkBanned(target.clerkUserId, !nextActive);

    revalidateUsers();
    return ok();
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error ? error.message : "تعذر تحديث حالة الحساب.";
    return fail(message);
  }
}

/**
 * Soft-delete (disable + ban) when the user has kitchens/orders.
 * Hard-delete only when safe (no kitchens/orders), after clearing deposit review FKs.
 */
export async function deleteAdminManagedUser(
  userId: string,
): Promise<AdminUserActionResult> {
  try {
    const admin = await requireRole(["admin"]);
    const id = userId.trim();
    if (!id) return fail("المستخدم مطلوب.");

    const target = await db.user.findUnique({
      where: { id },
      include: {
        _count: { select: { kitchens: true, customerOrders: true } },
      },
    });
    if (!target) return fail("المستخدم غير موجود.");

    if (target.id === admin.appUserId) {
      return fail("لا يمكنك حذف حسابك.");
    }

    if (target.role === UserRole.ADMIN) {
      const otherAdmins = await db.user.count({
        where: { role: UserRole.ADMIN, id: { not: id }, isActive: true },
      });
      if (otherAdmins === 0) {
        return fail("لا يمكن حذف آخر أدمن نشط.");
      }
    }

    const hasLinkedData =
      target._count.kitchens > 0 || target._count.customerOrders > 0;

    if (hasLinkedData) {
      await db.user.update({
        where: { id },
        data: { isActive: false },
      });
      await setClerkBanned(target.clerkUserId, true);
      revalidateUsers();
      return {
        ok: true,
        message:
          "تم تعطيل الحساب بدلاً من الحذف لأنه مرتبط بمطبخ أو طلبات.",
      };
    }

    // Clear optional FK that blocks delete (no onDelete).
    await db.depositProof.updateMany({
      where: { reviewedByUserId: id },
      data: { reviewedByUserId: null },
    });

    if (target.clerkUserId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(target.clerkUserId);
      } catch {
        // Continue with DB delete
      }
    }

    await db.user.delete({ where: { id } });
    revalidateUsers();
    return ok();
  } catch (error) {
    unstable_rethrow(error);
    const message =
      error instanceof Error ? error.message : "تعذر حذف المستخدم.";
    return fail(message);
  }
}
