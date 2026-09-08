import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type MenuPayload = {
  name: string;
  description?: string;
  basePrice: number;
  depositAmount: number;
  imageUrl?: string;
  sizes?: Array<{
    sizeName: string;
    price: number;
    depositAmount?: number | null;
  }>;
};

export async function GET() {
  try {
    const user = await requireAuth();
    const kitchen = await db.kitchen.findUnique({
      where: {
        ownerUserId: user.appUserId,
      },
      include: {
        menuItems: {
          include: {
            sizes: {
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو." },
        { status: 404 },
      );
    }

    return NextResponse.json({ kitchen, menuItems: kitchen.menuItems });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل المنيو.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as MenuPayload;

    const kitchen = await db.kitchen.findUnique({
      where: {
        ownerUserId: user.appUserId,
      },
      select: {
        id: true,
      },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا قبل إدارة المنيو." },
        { status: 404 },
      );
    }

    if (!payload.name) {
      return NextResponse.json({ error: "اسم الصنف مطلوب." }, { status: 400 });
    }

    if (payload.depositAmount > payload.basePrice * 0.6) {
      return NextResponse.json(
        { error: "العربون لا يجب أن يتجاوز 60% من سعر الصنف." },
        { status: 400 },
      );
    }

    const createdItem = await db.menuItem.create({
      data: {
        kitchenId: kitchen.id,
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        imageUrl: payload.imageUrl?.trim() || null,
        basePrice: payload.basePrice.toFixed(2),
        depositAmount: payload.depositAmount.toFixed(2),
        isAvailable: true,
      },
    });

    const sizes = (payload.sizes ?? []).filter(
      (size) => size.sizeName.trim() && Number.isFinite(size.price),
    );

    if (sizes.length) {
      for (const size of sizes) {
        if (size.depositAmount !== undefined && size.depositAmount !== null) {
          if (size.depositAmount > size.price * 0.6) {
            return NextResponse.json(
              {
                error: `عربون الحجم "${size.sizeName}" لا يجب أن يتجاوز 60% من السعر.`,
              },
              { status: 400 },
            );
          }
        }
      }

      await db.menuItemSize.createMany({
        data: sizes.map((size) => ({
          menuItemId: createdItem.id,
          sizeName: size.sizeName.trim(),
          price: size.price.toFixed(2),
          depositAmount: size.depositAmount?.toFixed(2) ?? null,
          isActive: true,
        })),
      });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إنشاء الصنف.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
