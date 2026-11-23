import { DeliveryType, NotificationType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { buildCheckoutQuote } from "@/lib/checkout-quote";
import { parseCheckoutPayload } from "@/lib/checkout-quote-model";
import { db } from "@/lib/db";
import { sweepOverdueKitchenOrders } from "@/lib/kitchen-acceptance-sweep";
import { createNotification } from "@/lib/notifications";
import {
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
} from "@/lib/phone";

function readOptionalText(raw: unknown, key: string) {
  if (!raw || typeof raw !== "object") return "";
  const value = (raw as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    await sweepOverdueKitchenOrders();
    const raw = await request.json();
    const parsed = parseCheckoutPayload(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const preview = await buildCheckoutQuote(parsed.value);
    if (!preview.orderable) {
      return NextResponse.json(
        { error: preview.blockingError },
        { status: preview.httpStatus },
      );
    }

    const customer = await db.user.findUnique({
      where: { id: user.appUserId },
      select: { phoneNumber: true },
    });

    if (!customer?.phoneNumber) {
      return NextResponse.json(
        {
          error:
            "لا يوجد رقم هاتف مسجّل على حسابك. حدّث بيانات الحساب قبل إرسال الطلب.",
        },
        { status: 400 },
      );
    }

    let customerContactPhone: string | null = null;
    const rawAlt = readOptionalText(raw, "customerContactPhone");
    if (rawAlt) {
      const normalized = normalizeEgyptianPhone(rawAlt);
      if (!isValidEgyptianPhone(normalized)) {
        return NextResponse.json(
          {
            error:
              "رقم هاتف التواصل الإضافي غير صالح. يجب أن يبدأ بـ 01 ويكون 11 رقمًا.",
          },
          { status: 400 },
        );
      }
      customerContactPhone = normalized;
    }

    const quote = await buildCheckoutQuote(parsed.value, { commitDeals: true });
    if (
      !quote.orderable ||
      !quote.kitchenId ||
      !quote.regionId ||
      !quote.kitchenOwnerUserId ||
      quote.orderItems.length === 0
    ) {
      return NextResponse.json(
        { error: quote.blockingError ?? "تعذر إنشاء الطلب." },
        { status: quote.orderable ? 400 : quote.httpStatus },
      );
    }

    const order = await db.order.create({
      data: {
        orderNumber: `TK-${Date.now()}`,
        customerId: user.appUserId,
        kitchenId: quote.kitchenId,
        deliveryType: quote.deliveryType,
        customerAddressId:
          quote.deliveryType === DeliveryType.DELIVERY
            ? quote.customerAddressId
            : null,
        regionId: quote.regionId,
        subtotalAmount: quote.subtotalAmount,
        totalAmount: quote.subtotalAmount,
        depositAmount: quote.depositAmount,
        customerNotes: readOptionalText(raw, "customerNotes") || null,
        customerContactPhone,
        deliveryLatitude: quote.deliveryLatitude,
        deliveryLongitude: quote.deliveryLongitude,
        items: {
          create: quote.orderItems.map((item) => ({
            menuItemId: item.menuItemId,
            menuItemSizeId: item.menuItemSizeId,
            itemNameSnapshot: item.itemNameSnapshot,
            sizeNameSnapshot: item.sizeNameSnapshot,
            unitPrice: item.unitPrice,
            depositAmount: item.depositAmount,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            customerNote: item.customerNote,
          })),
        },
      },
    });

    await createNotification({
      userId: quote.kitchenOwnerUserId,
      orderId: order.id,
      type: NotificationType.ORDER,
      title: "طلب جديد",
      body: `تم استلام طلب جديد برقم ${order.orderNumber}.`,
    });

    return NextResponse.json(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الطلب.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
