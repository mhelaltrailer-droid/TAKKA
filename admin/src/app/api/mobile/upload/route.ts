import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";

import { requireAuth } from "@/lib/auth";

const utapi = new UTApi();

const ALLOWED_PURPOSES = new Set([
  "kitchenLogo",
  "kitchenCover",
  "kitchenDocument",
  "menuItemImage",
  "depositProofImage",
  "chatImage",
]);

export async function POST(request: Request) {
  try {
    await requireAuth();

    const formData = await request.formData();
    const purpose = formData.get("purpose")?.toString() ?? "";
    const file = formData.get("file");

    if (!ALLOWED_PURPOSES.has(purpose)) {
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

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "يسمح برفع الصور فقط." },
        { status: 400 },
      );
    }

    const result = await utapi.uploadFiles(file);

    if ("error" in result && result.error) {
      return NextResponse.json(
        { error: result.error.message || "فشل رفع الصورة." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: result.data.ufsUrl,
      key: result.data.key,
      purpose,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر رفع الصورة.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
