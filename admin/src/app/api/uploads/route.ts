import { NextResponse } from "next/server";

import {
  isUploadPurpose,
  requireUploadApiUser,
  uploadImageFile,
} from "@/lib/server-upload";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUploadApiUser();

    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولًا." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const purposeRaw = formData.get("purpose")?.toString() ?? "";
    const file = formData.get("file");

    if (!isUploadPurpose(purposeRaw)) {
      return NextResponse.json(
        { error: "غرض الرفع غير صالح." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "ملف الصورة مطلوب." },
        { status: 400 },
      );
    }

    const uploaded = await uploadImageFile({
      file,
      purpose: purposeRaw,
      role: user.role,
    });

    return NextResponse.json(uploaded);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر رفع الصورة.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
