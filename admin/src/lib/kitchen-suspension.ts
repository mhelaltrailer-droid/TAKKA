import {
  KitchenSuspensionEnd,
  KitchenSuspensionLevel,
  NotificationType,
} from "@prisma/client";

import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import {
  KITCHEN_NO_RESPONSE_REASON,
  type KitchenOrderPolicyValues,
  type SuspensionLevelCode,
  ownerCanLiftSuspension,
  rollingWindowStart,
  suspensionDecision,
  suspensionLevelFor,
  suspensionMessageFor,
} from "@/lib/kitchen-order-rules";

const OWNER_REACTIVATION_NOTE =
  "أعاد صاحب المطبخ التفعيل بعد الضغط على «فهمت».";
const ADMIN_REACTIVATION_NOTE = "أعاد المدير تفعيل المطبخ يدويًا.";

function toPrismaLevel(level: SuspensionLevelCode) {
  return level === "LEVEL_1"
    ? KitchenSuspensionLevel.LEVEL_1
    : KitchenSuspensionLevel.LEVEL_2;
}

export async function suspendKitchenForNoResponse(input: {
  kitchenId: string;
  now: Date;
  policy: KitchenOrderPolicyValues;
}) {
  const kitchen = await db.kitchen.findUnique({
    where: { id: input.kitchenId },
    select: {
      id: true,
      kitchenName: true,
      ownerUserId: true,
      suspendedAt: true,
      suspensionLevel: true,
    },
  });

  if (!kitchen || kitchen.suspensionLevel === KitchenSuspensionLevel.LEVEL_2) {
    return false;
  }

  const shortSince = rollingWindowStart(
    input.now,
    input.policy.shortWindowHours,
    "hours",
  );
  const longSince = rollingWindowStart(
    input.now,
    input.policy.longWindowDays,
    "days",
  );
  const noResponseWhere = {
    kitchenId: kitchen.id,
    cancelReason: KITCHEN_NO_RESPONSE_REASON,
  };
  const [shortCount, longCount] = await Promise.all([
    db.order.count({
      where: { ...noResponseWhere, cancelledAt: { gte: shortSince } },
    }),
    db.order.count({
      where: { ...noResponseWhere, cancelledAt: { gte: longSince } },
    }),
  ]);

  const level = suspensionLevelFor(
    suspensionDecision({
      shortCount,
      longCount,
      shortWindowCount: input.policy.shortWindowCount,
      longWindowCount: input.policy.longWindowCount,
    }),
  );
  if (!level) {
    return false;
  }
  if (
    kitchen.suspensionLevel === KitchenSuspensionLevel.LEVEL_1 &&
    level === "LEVEL_1"
  ) {
    return false;
  }

  const body = suspensionMessageFor(level, input.policy);
  const prismaLevel = toPrismaLevel(level);

  if (kitchen.suspendedAt) {
    await db.kitchenSuspensionRecord.updateMany({
      where: { kitchenId: kitchen.id, endedAt: null },
      data: {
        endedAt: input.now,
        endKind: KitchenSuspensionEnd.UPGRADED,
      },
    });
  }

  await db.kitchenSuspensionRecord.create({
    data: {
      kitchenId: kitchen.id,
      level: prismaLevel,
      reason: body,
      startedAt: input.now,
    },
  });

  await db.kitchen.update({
    where: { id: kitchen.id },
    data: {
      suspendedAt: input.now,
      suspensionLevel: prismaLevel,
      suspensionReason: body,
      suspensionNotificationId: null,
    },
  });

  try {
    const notification = await createNotification({
      userId: kitchen.ownerUserId,
      type: NotificationType.SYSTEM,
      title:
        level === "LEVEL_1"
          ? "تم إيقاف استقبال الطلبات مؤقتًا"
          : "تم إيقاف المطبخ",
      body,
    });
    await db.kitchen.update({
      where: { id: kitchen.id },
      data: { suspensionNotificationId: notification.id },
    });
  } catch {
    console.error("[kitchen-acceptance] suspension notification failed");
  }

  try {
    await db.adminAction.create({
      data: {
        adminUserId: null,
        targetType: "Kitchen",
        targetId: kitchen.id,
        actionType: "KITCHEN_SUSPENDED",
        actionNotes: `${prismaLevel}: ${body}`,
      },
    });
  } catch {
    console.error("[kitchen-acceptance] suspension log failed");
  }

  return true;
}

export async function clearKitchenSuspension(input: {
  kitchenId: string;
  actorUserId: string;
  endKind: "ACKNOWLEDGED" | "ADMIN_REACTIVATED";
  actionNotes: string;
  allowLevel2: boolean;
}) {
  const kitchen = await db.kitchen.findUnique({
    where: { id: input.kitchenId },
    select: {
      id: true,
      suspendedAt: true,
      suspensionLevel: true,
      suspensionNotificationId: true,
    },
  });
  if (!kitchen?.suspendedAt) {
    return false;
  }

  const level =
    kitchen.suspensionLevel === KitchenSuspensionLevel.LEVEL_2
      ? "LEVEL_2"
      : "LEVEL_1";
  if (!input.allowLevel2 && !ownerCanLiftSuspension(level)) {
    return false;
  }

  if (kitchen.suspensionNotificationId) {
    await db.notification.updateMany({
      where: { id: kitchen.suspensionNotificationId },
      data: { isRead: true },
    });
  }

  const now = new Date();
  await db.kitchenSuspensionRecord.updateMany({
    where: { kitchenId: kitchen.id, endedAt: null },
    data: {
      endedAt: now,
      endKind:
        input.endKind === "ACKNOWLEDGED"
          ? KitchenSuspensionEnd.ACKNOWLEDGED
          : KitchenSuspensionEnd.ADMIN_REACTIVATED,
      endedByUserId: input.actorUserId,
    },
  });

  const cleared = await db.kitchen.updateMany({
    where: { id: kitchen.id, suspendedAt: { not: null } },
    data: {
      suspendedAt: null,
      suspensionLevel: null,
      suspensionReason: null,
      suspensionNotificationId: null,
    },
  });
  if (cleared.count !== 1) {
    return false;
  }

  await db.adminAction.create({
    data: {
      adminUserId: input.actorUserId,
      targetType: "Kitchen",
      targetId: kitchen.id,
      actionType: "KITCHEN_REACTIVATED",
      actionNotes: input.actionNotes,
    },
  });

  return true;
}

export async function acknowledgeKitchenSuspension(ownerUserId: string) {
  const kitchen = await db.kitchen.findUnique({
    where: { ownerUserId },
    select: { id: true, suspensionLevel: true, suspendedAt: true },
  });
  if (!kitchen) {
    return { found: false, cleared: false, requiresAdmin: false };
  }
  const requiresAdmin =
    Boolean(kitchen.suspendedAt) &&
    kitchen.suspensionLevel === KitchenSuspensionLevel.LEVEL_2;
  if (requiresAdmin) {
    return { found: true, cleared: false, requiresAdmin: true };
  }
  const cleared = await clearKitchenSuspension({
    kitchenId: kitchen.id,
    actorUserId: ownerUserId,
    endKind: "ACKNOWLEDGED",
    actionNotes: OWNER_REACTIVATION_NOTE,
    allowLevel2: false,
  });
  return { found: true, cleared, requiresAdmin: false };
}

export async function reactivateKitchenAsAdmin(input: {
  kitchenId: string;
  adminUserId: string;
}) {
  return clearKitchenSuspension({
    kitchenId: input.kitchenId,
    actorUserId: input.adminUserId,
    endKind: "ADMIN_REACTIVATED",
    actionNotes: ADMIN_REACTIVATION_NOTE,
    allowLevel2: true,
  });
}

/** Marking the level-1 warning read counts as «فهمت». Level 2 stays in place. */
export async function liftSuspensionForReadNotification(input: {
  notificationId: string;
  ownerUserId: string;
}) {
  const kitchen = await db.kitchen.findFirst({
    where: {
      ownerUserId: input.ownerUserId,
      suspensionNotificationId: input.notificationId,
      suspendedAt: { not: null },
      suspensionLevel: KitchenSuspensionLevel.LEVEL_1,
    },
    select: { id: true },
  });
  if (!kitchen) {
    return false;
  }
  return clearKitchenSuspension({
    kitchenId: kitchen.id,
    actorUserId: input.ownerUserId,
    endKind: "ACKNOWLEDGED",
    actionNotes: OWNER_REACTIVATION_NOTE,
    allowLevel2: false,
  });
}
