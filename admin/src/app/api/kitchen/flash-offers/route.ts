import { ApprovalStatus, FlashOfferStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  expireStaleFlashOffers,
  getActiveFlashOfferForKitchen,
  serializeFlashOffer,
} from "@/lib/deals";

type CreateFlashPayload = {
  menuItemId: string;
  offerPrice: number;
  quantity: number;
  /** Hours: 1 or 2 */
  durationHours: 1 | 2;
};

export async function GET() {
  try {
    const user = await requireAuth();
    const kitchen = await db.kitchen.findUnique({
      where: { ownerUserId: user.appUserId },
      select: { id: true },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا." },
        { status: 404 },
      );
    }

    const active = await getActiveFlashOfferForKitchen(kitchen.id);

    const recent = await db.flashOffer.findMany({
      where: { kitchenId: kitchen.id },
      include: {
        menuItem: {
          select: { name: true, imageUrl: true, basePrice: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return NextResponse.json({
      activeFlashOffer: active,
      recent: recent.map((o) => ({
        ...serializeFlashOffer(o),
        status: o.status,
        endedReason: o.endedReason,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحميل العروض السريعة.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as CreateFlashPayload;

    const kitchen = await db.kitchen.findUnique({
      where: { ownerUserId: user.appUserId },
      select: { id: true, approvalStatus: true },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "يجب إكمال إعداد المطبخ أولًا." },
        { status: 404 },
      );
    }

    if (kitchen.approvalStatus !== ApprovalStatus.APPROVED) {
      return NextResponse.json(
        { error: "يجب اعتماد المطبخ قبل إنشاء عرض سريع." },
        { status: 403 },
      );
    }

    const durationHours = Number(payload.durationHours);
    if (durationHours !== 1 && durationHours !== 2) {
      return NextResponse.json(
        { error: "مدة العرض يجب أن تكون ساعة أو ساعتين." },
        { status: 400 },
      );
    }

    const offerPrice = Number(payload.offerPrice);
    const quantity = Number(payload.quantity);

    if (!Number.isFinite(offerPrice) || offerPrice <= 0) {
      return NextResponse.json({ error: "سعر العرض غير صالح." }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر." },
        { status: 400 },
      );
    }

    const menuItem = await db.menuItem.findFirst({
      where: {
        id: payload.menuItemId,
        kitchenId: kitchen.id,
        approvalStatus: ApprovalStatus.APPROVED,
        isAvailable: true,
      },
    });

    if (!menuItem) {
      return NextResponse.json(
        { error: "الصنف غير موجود أو غير معتمد." },
        { status: 404 },
      );
    }

    if (offerPrice >= Number(menuItem.basePrice)) {
      return NextResponse.json(
        { error: "سعر العرض يجب أن يكون أقل من السعر العادي." },
        { status: 400 },
      );
    }

    await expireStaleFlashOffers([kitchen.id]);

    const existing = await db.flashOffer.findFirst({
      where: {
        kitchenId: kitchen.id,
        status: FlashOfferStatus.ACTIVE,
        endsAt: { gt: new Date() },
        quantityLeft: { gt: 0 },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "يوجد عرض سريع نشط بالفعل. أنهِ العرض الحالي قبل إنشاء عرض جديد.",
        },
        { status: 409 },
      );
    }

    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);

    const created = await db.flashOffer.create({
      data: {
        kitchenId: kitchen.id,
        menuItemId: menuItem.id,
        offerPrice,
        quantityLeft: quantity,
        startsAt,
        endsAt,
        status: FlashOfferStatus.ACTIVE,
      },
      include: {
        menuItem: {
          select: { name: true, imageUrl: true, basePrice: true },
        },
      },
    });

    return NextResponse.json(
      { activeFlashOffer: serializeFlashOffer(created) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إنشاء العرض السريع.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
