import { AvailabilityStatus, UserRole } from "@prisma/client";
import { clerkClient } from "@clerk/nextjs/server";

import { db } from "@/lib/db";

/**
 * Permanently deletes the signed-in app user from DB + Clerk.
 * Owned kitchen is closed first, then removed (hidden from discovery).
 */
export async function permanentlyDeleteAccount(input: {
  appUserId: string;
  clerkUserId: string | null | undefined;
}) {
  const user = await db.user.findUnique({
    where: { id: input.appUserId },
    select: {
      id: true,
      role: true,
      clerkUserId: true,
      kitchens: { select: { id: true } },
    },
  });

  if (!user) {
    throw new AccountDeletionError("الحساب غير موجود.", 404);
  }

  if (user.role === UserRole.ADMIN) {
    throw new AccountDeletionError(
      "لا يمكن حذف حساب أدمن من هنا. تواصل مع الدعم.",
      403,
    );
  }

  const clerkId = input.clerkUserId ?? user.clerkUserId;
  const kitchenIds = user.kitchens.map((kitchen) => kitchen.id);

  // Close kitchen first so it disappears from discovery even if later steps fail mid-way.
  if (kitchenIds.length > 0) {
    await db.kitchen.updateMany({
      where: { ownerUserId: user.id },
      data: { availabilityStatus: AvailabilityStatus.CLOSED },
    });
  }

  // Remove Clerk identity first so the user cannot sign back in and re-sync.
  if (clerkId) {
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(clerkId);
    } catch {
      // Continue — DB deletion still required for local cleanup.
    }
  }

  await db.$transaction(async (tx) => {
    // Order.customerAddressId has no onDelete — clear before address cascade.
    await tx.order.updateMany({
      where: { customerId: user.id, customerAddressId: { not: null } },
      data: { customerAddressId: null },
    });

    // DepositProof.reviewedBy has no onDelete.
    await tx.depositProof.updateMany({
      where: { reviewedByUserId: user.id },
      data: { reviewedByUserId: null },
    });

    // Delete orders before kitchen/menu so OrderItem → MenuItem FKs do not block.
    if (kitchenIds.length > 0) {
      await tx.order.deleteMany({
        where: {
          OR: [{ customerId: user.id }, { kitchenId: { in: kitchenIds } }],
        },
      });
      await tx.kitchen.deleteMany({
        where: { ownerUserId: user.id },
      });
    } else {
      await tx.order.deleteMany({
        where: { customerId: user.id },
      });
    }

    await tx.user.delete({ where: { id: user.id } });
  });
}

export class AccountDeletionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AccountDeletionError";
  }
}
