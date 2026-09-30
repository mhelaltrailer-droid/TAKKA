import { ApprovalStatus, AvailabilityStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

type AvailabilityPayload = {
  availabilityStatus?: string;
};

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const payload = (await request.json()) as AvailabilityPayload;
    const nextStatus = payload.availabilityStatus?.trim().toUpperCase();

    if (
      nextStatus !== AvailabilityStatus.OPEN &&
      nextStatus !== AvailabilityStatus.CLOSED
    ) {
      return NextResponse.json(
        { error: "حالة التوفر غير صحيحة. استخدم OPEN أو CLOSED." },
        { status: 400 },
      );
    }

    const kitchen = await db.kitchen.findUnique({
      where: {
        ownerUserId: user.appUserId,
      },
      select: {
        id: true,
        approvalStatus: true,
        availabilityStatus: true,
      },
    });

    if (!kitchen) {
      return NextResponse.json(
        { error: "لا يوجد مطبخ مرتبط بحسابك." },
        { status: 404 },
      );
    }

    if (kitchen.approvalStatus !== ApprovalStatus.APPROVED) {
      return NextResponse.json(
        {
          error:
            nextStatus === AvailabilityStatus.OPEN
              ? "لا يمكن فتح المطبخ قبل موافقة الإدارة."
              : "لا يمكن تغيير حالة التوفر قبل موافقة الإدارة.",
        },
        { status: 400 },
      );
    }

    if (kitchen.availabilityStatus === nextStatus) {
      return NextResponse.json({
        success: true,
        availabilityStatus: kitchen.availabilityStatus,
      });
    }

    const updated = await db.kitchen.update({
      where: {
        id: kitchen.id,
      },
      data: {
        availabilityStatus: nextStatus,
      },
      select: {
        id: true,
        availabilityStatus: true,
        approvalStatus: true,
      },
    });

    return NextResponse.json({
      success: true,
      kitchen: updated,
      availabilityStatus: updated.availabilityStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تحديث حالة المطبخ.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
