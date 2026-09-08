import { DeliveryType, NotificationType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

type CreateOrderItemInput = {
  menuItemId: string;
  quantity: number;
  menuItemSizeId?: string;
  customerNote?: string;
};

type CreateOrderPayload = {
  kitchenId: string;
  deliveryType: "pickup" | "delivery";
  customerAddressId?: string;
  customerNotes?: string;
  items: CreateOrderItemInput[];
};

function toMoney(value: Prisma.Decimal | number) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as CreateOrderPayload;

    if (!payload.kitchenId || !Array.isArray(payload.items) || !payload.items.length) {
      return NextResponse.json(
        { error: "بيانات الطلب غير مكتملة." },
        { status: 400 },
      );
    }

    const deliveryType =
      payload.deliveryType === "delivery"
        ? DeliveryType.DELIVERY
        : DeliveryType.PICKUP;

    const kitchen = await db.kitchen.findUnique({
      where: {
        id: payload.kitchenId,
      },
      select: {
        id: true,
        ownerUserId: true,
        regionId: true,
        availabilityStatus: true,
        approvalStatus: true,
      },
    });

    if (!kitchen) {
      return NextResponse.json({ error: "المطبخ غير موجود." }, { status: 404 });
    }

    if (deliveryType === DeliveryType.DELIVERY && !payload.customerAddressId) {
      return NextResponse.json(
        { error: "عنوان التوصيل مطلوب." },
        { status: 400 },
      );
    }

    const requestedItemIds = payload.items.map((item) => item.menuItemId);

    const menuItems = await db.menuItem.findMany({
      where: {
        id: {
          in: requestedItemIds,
        },
        kitchenId: kitchen.id,
        isAvailable: true,
      },
      include: {
        sizes: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (menuItems.length !== requestedItemIds.length) {
      return NextResponse.json(
        { error: "بعض الأصناف غير متاحة أو لا تتبع هذا المطبخ." },
        { status: 400 },
      );
    }

    const orderItemsData = payload.items.map((requestedItem) => {
      const menuItem = menuItems.find((item) => item.id === requestedItem.menuItemId);

      if (!menuItem) {
        throw new Error("الصنف المطلوب غير موجود.");
      }

      const selectedSize = requestedItem.menuItemSizeId
        ? menuItem.sizes.find((size) => size.id === requestedItem.menuItemSizeId)
        : null;

      const unitPrice = selectedSize?.price ?? menuItem.basePrice;
      const depositAmount = selectedSize?.depositAmount ?? menuItem.depositAmount;
      const quantity = requestedItem.quantity;

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`الكمية غير صحيحة للصنف "${menuItem.name}".`);
      }

      return {
        menuItemId: menuItem.id,
        menuItemSizeId: selectedSize?.id ?? null,
        itemNameSnapshot: menuItem.name,
        sizeNameSnapshot: selectedSize?.sizeName ?? null,
        unitPrice,
        depositAmount,
        quantity,
        lineTotal: unitPrice.mul(quantity),
        customerNote: requestedItem.customerNote?.trim() || null,
      };
    });

    const subtotalAmount = orderItemsData.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const depositAmount = orderItemsData.reduce(
      (sum, item) => sum.add(item.depositAmount.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    if (depositAmount.gt(subtotalAmount.mul(0.6))) {
      return NextResponse.json(
        { error: "إجمالي العربون لا يجب أن يتجاوز 60% من قيمة الطلب." },
        { status: 400 },
      );
    }

    const order = await db.order.create({
      data: {
        orderNumber: `TK-${Date.now()}`,
        customerId: user.appUserId,
        kitchenId: kitchen.id,
        deliveryType,
        customerAddressId: payload.customerAddressId ?? null,
        regionId: kitchen.regionId,
        subtotalAmount: toMoney(subtotalAmount),
        totalAmount: toMoney(subtotalAmount),
        depositAmount: toMoney(depositAmount),
        customerNotes: payload.customerNotes?.trim() || null,
        items: {
          create: orderItemsData.map((item) => ({
            menuItemId: item.menuItemId,
            menuItemSizeId: item.menuItemSizeId,
            itemNameSnapshot: item.itemNameSnapshot,
            sizeNameSnapshot: item.sizeNameSnapshot,
            unitPrice: toMoney(item.unitPrice),
            depositAmount: toMoney(item.depositAmount),
            quantity: item.quantity,
            lineTotal: toMoney(item.lineTotal),
            customerNote: item.customerNote,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    await createNotification({
      userId: kitchen.ownerUserId,
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
