import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildReorderPreview,
  type ReorderMenuItem,
} from "@/lib/reorder-preview";

function money(value: { toString(): string } | number | null | undefined) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const order = await db.order.findFirst({
      where: {
        id,
        customerId: user.appUserId,
      },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
        },
        kitchen: {
          select: {
            id: true,
            kitchenName: true,
            slug: true,
            approvalStatus: true,
            availabilityStatus: true,
            suspendedAt: true,
            latitude: true,
            longitude: true,
            addressLine: true,
            region: {
              select: {
                cityName: true,
                regionName: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "الطلب غير موجود." }, { status: 404 });
    }

    const menuItemIds = [
      ...new Set(order.items.map((item) => item.menuItemId)),
    ];
    const now = new Date();
    const menuItems = menuItemIds.length
      ? await db.menuItem.findMany({
          where: {
            id: { in: menuItemIds },
            kitchenId: order.kitchenId,
          },
          include: {
            sizes: true,
            flashOffers: {
              where: {
                status: "ACTIVE",
                endsAt: { gt: now },
                quantityLeft: { gt: 0 },
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        })
      : [];

    const preview = buildReorderPreview({
      kitchen: {
        id: order.kitchen.id,
        kitchenName: order.kitchen.kitchenName,
        slug: order.kitchen.slug,
        approvalStatus: order.kitchen.approvalStatus,
        availabilityStatus: order.kitchen.availabilityStatus,
        suspended: order.kitchen.suspendedAt != null,
        latitude: order.kitchen.latitude,
        longitude: order.kitchen.longitude,
        addressLine: order.kitchen.addressLine,
        regionLabel: `${order.kitchen.region.cityName} - ${order.kitchen.region.regionName}`,
      },
      orderItems: order.items.map((item) => ({
        menuItemId: item.menuItemId,
        menuItemSizeId: item.menuItemSizeId,
        itemNameSnapshot: item.itemNameSnapshot,
        sizeNameSnapshot: item.sizeNameSnapshot,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        customerNote: item.customerNote,
      })),
      menuItems: menuItems.map((item): ReorderMenuItem => {
        const flash = item.flashOffers[0];
        return {
          id: item.id,
          name: item.name,
          approvalStatus: item.approvalStatus,
          isAvailable: item.isAvailable,
          isDishOfTheDay: item.isDishOfTheDay,
          dishOfTheDayPrice: money(item.dishOfTheDayPrice),
          dishOfTheDayQty: item.dishOfTheDayQty,
          basePrice: Number(item.basePrice),
          discountedPrice: money(item.discountedPrice),
          depositAmount: Number(item.depositAmount),
          orderReadiness: item.orderReadiness,
          sizes: item.sizes.map((size) => ({
            id: size.id,
            sizeName: size.sizeName,
            price: Number(size.price),
            discountedPrice: money(size.discountedPrice),
            depositAmount: money(size.depositAmount),
            isActive: size.isActive,
          })),
          flash: flash
            ? {
                offerPrice: Number(flash.offerPrice),
                quantityLeft: flash.quantityLeft,
              }
            : null,
        };
      }),
    });

    return NextResponse.json(preview);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تجهيز الطلب تاني.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
