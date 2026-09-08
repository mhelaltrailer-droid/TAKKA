"use server";

import {
  DeliveryType,
  DepositReviewStatus,
  MessageType,
  NotificationType,
  OrderStatus,
  UserRole,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getAllowedNextStatuses } from "@/lib/order-status";
import { triggerOrderEvent } from "@/lib/pusher";

function getString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

async function requireKitchenContext() {
  const user = await requireAuth();
  const kitchen = await db.kitchen.findUnique({
    where: {
      ownerUserId: user.appUserId,
    },
    select: {
      id: true,
    },
  });

  if (!kitchen) {
    throw new Error("لا يوجد مطبخ مرتبط بحسابك.");
  }

  return kitchen;
}

async function getKitchenOrder(orderId: string) {
  const kitchen = await requireKitchenContext();
  const order = await db.order.findFirst({
    where: {
      id: orderId,
      kitchenId: kitchen.id,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveryType: true,
      subtotalAmount: true,
      deliveryFee: true,
      totalAmount: true,
      customerId: true,
    },
  });

  if (!order) {
    throw new Error("الطلب غير موجود.");
  }

  return order;
}

export async function acceptOrder(formData: FormData) {
  const orderId = getString(formData, "orderId");
  const deliveryFeeRaw = getString(formData, "deliveryFee");
  const order = await getKitchenOrder(orderId);

  if (order.status !== OrderStatus.PENDING_KITCHEN_APPROVAL) {
    throw new Error("هذا الطلب لم يعد في مرحلة انتظار القبول.");
  }

  const deliveryFee =
    order.deliveryType === DeliveryType.DELIVERY
      ? Number(deliveryFeeRaw || "0")
      : 0;

  if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
    throw new Error("رسوم التوصيل غير صحيحة.");
  }

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      deliveryFee: deliveryFee.toFixed(2),
      totalAmount: order.subtotalAmount.add(deliveryFee),
      status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
      acceptedAt: new Date(),
    },
  });

  await createNotification({
    userId: order.customerId,
    orderId: order.id,
    type: NotificationType.ORDER,
    title: "تم قبول الطلب",
    body: `تم قبول طلبك ${order.orderNumber} ويمكنك الآن إرسال العربون.`,
  });

  await triggerOrderEvent(order.id, "status:changed", {
    orderId: order.id,
    status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
  });

  revalidatePath("/dashboard/orders");
}

export async function rejectOrder(formData: FormData) {
  const orderId = getString(formData, "orderId");
  const order = await getKitchenOrder(orderId);

  if (order.status !== OrderStatus.PENDING_KITCHEN_APPROVAL) {
    throw new Error("هذا الطلب لم يعد في مرحلة انتظار القبول.");
  }

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.REJECTED_BY_KITCHEN,
      cancelledBy: UserRole.KITCHEN_OWNER,
      cancelledAt: new Date(),
    },
  });

  await createNotification({
    userId: order.customerId,
    orderId: order.id,
    type: NotificationType.ORDER,
    title: "تم رفض الطلب",
    body: `تم رفض الطلب ${order.orderNumber} من جهة المطبخ.`,
  });

  await triggerOrderEvent(order.id, "status:changed", {
    orderId: order.id,
    status: OrderStatus.REJECTED_BY_KITCHEN,
  });

  revalidatePath("/dashboard/orders");
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = getString(formData, "orderId");
  const nextStatus = getString(formData, "nextStatus") as OrderStatus;
  const order = await getKitchenOrder(orderId);

  const allowedStatuses = getAllowedNextStatuses(order.status, order.deliveryType);

  if (!allowedStatuses.includes(nextStatus)) {
    throw new Error("الانتقال المطلوب غير مسموح لهذه الحالة.");
  }

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: nextStatus,
      ...(nextStatus === OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER
        ? { deliveredAt: new Date() }
        : {}),
      ...(nextStatus === OrderStatus.COMPLETED
        ? { completedAt: new Date() }
        : {}),
    },
  });

  await createNotification({
    userId: order.customerId,
    orderId: order.id,
    type: NotificationType.ORDER,
    title: "تم تحديث حالة الطلب",
    body: `حالة الطلب ${order.orderNumber} أصبحت ${nextStatus}.`,
  });

  await triggerOrderEvent(order.id, "status:changed", {
    orderId: order.id,
    status: nextStatus,
  });

  revalidatePath("/dashboard/orders");
}

export async function approveDepositProof(formData: FormData) {
  const user = await requireAuth();
  const orderId = getString(formData, "orderId");
  const depositProofId = getString(formData, "depositProofId");
  const order = await getKitchenOrder(orderId);

  if (order.status !== OrderStatus.DEPOSIT_PROOF_SUBMITTED) {
    throw new Error("هذا الطلب ليس في مرحلة مراجعة إثبات العربون.");
  }

  const proof = await db.depositProof.findFirst({
    where: {
      id: depositProofId,
      orderId: order.id,
    },
    select: {
      id: true,
    },
  });

  if (!proof) {
    throw new Error("إثبات العربون غير موجود.");
  }

  await db.depositProof.update({
    where: {
      id: proof.id,
    },
    data: {
      reviewStatus: DepositReviewStatus.ACCEPTED,
      reviewedByUserId: user.appUserId,
      reviewedAt: new Date(),
      reviewNotes: null,
    },
  });

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.DEPOSIT_CONFIRMED,
      depositConfirmedAt: new Date(),
    },
  });

  await createNotification({
    userId: order.customerId,
    orderId: order.id,
    type: NotificationType.DEPOSIT,
    title: "تم تأكيد العربون",
    body: `تم تأكيد العربون للطلب ${order.orderNumber}.`,
  });

  await triggerOrderEvent(order.id, "deposit:updated", {
    orderId: order.id,
    status: OrderStatus.DEPOSIT_CONFIRMED,
  });

  revalidatePath("/dashboard/orders");
}

export async function rejectDepositProof(formData: FormData) {
  const user = await requireAuth();
  const orderId = getString(formData, "orderId");
  const depositProofId = getString(formData, "depositProofId");
  const order = await getKitchenOrder(orderId);

  if (order.status !== OrderStatus.DEPOSIT_PROOF_SUBMITTED) {
    throw new Error("هذا الطلب ليس في مرحلة مراجعة إثبات العربون.");
  }

  const proof = await db.depositProof.findFirst({
    where: {
      id: depositProofId,
      orderId: order.id,
    },
    select: {
      id: true,
    },
  });

  if (!proof) {
    throw new Error("إثبات العربون غير موجود.");
  }

  await db.depositProof.update({
    where: {
      id: proof.id,
    },
    data: {
      reviewStatus: DepositReviewStatus.REJECTED,
      reviewedByUserId: user.appUserId,
      reviewedAt: new Date(),
      reviewNotes: "تم رفض الإثبات ويحتاج العميل إلى إعادة الإرسال.",
    },
  });

  await db.order.update({
    where: {
      id: order.id,
    },
    data: {
      status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
    },
  });

  await createNotification({
    userId: order.customerId,
    orderId: order.id,
    type: NotificationType.DEPOSIT,
    title: "تم رفض إثبات العربون",
    body: `يرجى إعادة إرسال إثبات العربون للطلب ${order.orderNumber}.`,
  });

  await triggerOrderEvent(order.id, "deposit:updated", {
    orderId: order.id,
    status: OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
  });

  revalidatePath("/dashboard/orders");
}

export async function sendKitchenOrderMessage(formData: FormData) {
  const user = await requireAuth();
  const kitchen = await requireKitchenContext();
  const orderId = getString(formData, "orderId");
  const messageText = getString(formData, "messageText");
  const imageUrl = getString(formData, "imageUrl");

  const order = await db.order.findFirst({
    where: {
      id: orderId,
      kitchenId: kitchen.id,
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      customerId: true,
    },
  });

  if (!order) {
    throw new Error("الطلب غير موجود.");
  }

  if (
    order.status === OrderStatus.PENDING_KITCHEN_APPROVAL ||
    order.status === OrderStatus.REJECTED_BY_KITCHEN
  ) {
    throw new Error("المحادثة لا تفتح إلا بعد قبول الطلب.");
  }

  if (!messageText && !imageUrl) {
    throw new Error("أدخل رسالة أو ارفع صورة قبل الإرسال.");
  }

  const createdMessage = await db.orderMessage.create({
    data: {
      orderId: order.id,
      senderUserId: user.appUserId,
      messageType: imageUrl ? MessageType.IMAGE : MessageType.TEXT,
      messageText: messageText || null,
      fileUrl: imageUrl || null,
    },
  });

  await createNotification({
    userId: order.customerId,
    orderId: order.id,
    type: NotificationType.CHAT,
    title: "رسالة جديدة من المطبخ",
    body: `وصلتك رسالة جديدة بخصوص الطلب ${order.orderNumber}.`,
  });

  await triggerOrderEvent(order.id, "message:new", {
    id: createdMessage.id,
    messageType: createdMessage.messageType,
    messageText: createdMessage.messageText,
    fileUrl: createdMessage.fileUrl,
    sentAt: createdMessage.sentAt.toISOString(),
  });

  revalidatePath("/dashboard/orders");
}
