import { FlashOfferStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { serializeFlashOffer } from "@/lib/deals";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

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

    const offer = await db.flashOffer.findFirst({
      where: { id, kitchenId: kitchen.id },
      include: {
        menuItem: {
          select: { name: true, imageUrl: true, basePrice: true },
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "العرض غير موجود." }, { status: 404 });
    }

    if (offer.status !== FlashOfferStatus.ACTIVE) {
      return NextResponse.json({
        activeFlashOffer: null,
        ended: serializeFlashOffer(offer),
      });
    }

    const ended = await db.flashOffer.update({
      where: { id: offer.id },
      data: {
        status: FlashOfferStatus.ENDED,
        endedReason: "MANUAL",
      },
      include: {
        menuItem: {
          select: { name: true, imageUrl: true, basePrice: true },
        },
      },
    });

    return NextResponse.json({
      activeFlashOffer: null,
      ended: serializeFlashOffer(ended),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر إنهاء العرض.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
