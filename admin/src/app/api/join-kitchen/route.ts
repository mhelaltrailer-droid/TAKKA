import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  isKitchenJoinSegment,
  normalizeLeadSource,
} from "@/lib/kitchen-join-leads";
import {
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  phoneValidationMessage,
} from "@/lib/phone";

type JoinPayload = {
  fullName?: string;
  district?: string;
  segment?: string;
  whatsapp?: string;
  source?: string;
};

/**
 * Public: capture kitchen supply interest from /join-kitchen.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as JoinPayload;
    const fullName = payload.fullName?.trim() ?? "";
    const district = payload.district?.trim() ?? "";
    const segmentRaw = payload.segment?.trim() ?? "";
    const whatsapp = normalizeEgyptianPhone(payload.whatsapp ?? "");
    const source = normalizeLeadSource(payload.source);

    if (!fullName || fullName.length < 2 || fullName.length > 80) {
      return NextResponse.json(
        { error: "الاسم مطلوب (حرفين على الأقل)." },
        { status: 400 },
      );
    }

    if (!district || district.length > 80) {
      return NextResponse.json({ error: "اختاري الحي." }, { status: 400 });
    }

    if (!isKitchenJoinSegment(segmentRaw)) {
      return NextResponse.json({ error: "اختاري نوع الانضمام." }, { status: 400 });
    }

    const phoneError = phoneValidationMessage(whatsapp);
    if (phoneError || !isValidEgyptianPhone(whatsapp)) {
      return NextResponse.json(
        { error: phoneError ?? "رقم الواتساب غير صالح." },
        { status: 400 },
      );
    }

    const existingOpen = await db.kitchenJoinLead.findFirst({
      where: {
        whatsapp,
        status: { not: "CLOSED" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (existingOpen) {
      return NextResponse.json(
        {
          error:
            "الرقم مسجّل عندنا بالفعل. فريق تكّة هيتواصل معاكي قريبًا لو لسه قيد المتابعة.",
          code: "DUPLICATE",
        },
        { status: 409 },
      );
    }

    const lead = await db.kitchenJoinLead.create({
      data: {
        fullName,
        district,
        segment: segmentRaw,
        whatsapp,
        source,
        status: "NEW",
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تسجيل الاهتمام.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
