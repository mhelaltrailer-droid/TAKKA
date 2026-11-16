import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentAppUser } from "@/lib/auth";
import { db } from "@/lib/db";

const tokenSchema = z.object({
  token: z.string().trim().min(10).max(4096),
  platform: z.enum(["android", "ios"]).optional(),
});

const MAX_TOKENS_PER_USER = 8;

async function requireUser() {
  const user = await getCurrentAppUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "UNAUTHENTICATED",
          message: "يجب تسجيل الدخول أولًا.",
        },
        { status: 401 },
      ),
    };
  }
  return { user, response: null };
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (!user) {
      return response;
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_BODY", message: "البيانات المرسلة غير صالحة." },
        { status: 400 },
      );
    }

    const parsed = tokenSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "رمز الجهاز غير صالح." },
        { status: 400 },
      );
    }

    const platform = parsed.data.platform ?? "android";
    await db.devicePushToken.upsert({
      where: { token: parsed.data.token },
      create: {
        userId: user.appUserId,
        token: parsed.data.token,
        platform,
      },
      update: {
        userId: user.appUserId,
        platform,
      },
    });

    const extras = await db.devicePushToken.findMany({
      where: { userId: user.appUserId },
      orderBy: { updatedAt: "desc" },
      skip: MAX_TOKENS_PER_USER,
      select: { id: true },
    });
    if (extras.length > 0) {
      await db.devicePushToken.deleteMany({
        where: { id: { in: extras.map((row) => row.id) } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push-token] register failed", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "تعذر حفظ رمز الجهاز." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { user, response } = await requireUser();
    if (!user) {
      return response;
    }

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json(
        { error: "INVALID_BODY", message: "البيانات المرسلة غير صالحة." },
        { status: 400 },
      );
    }

    const parsed = tokenSchema.pick({ token: true }).safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "رمز الجهاز غير صالح." },
        { status: 400 },
      );
    }

    await db.devicePushToken.deleteMany({
      where: {
        token: parsed.data.token,
        userId: user.appUserId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[push-token] unregister failed", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "تعذر حذف رمز الجهاز." },
      { status: 500 },
    );
  }
}
