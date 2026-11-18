import { NextResponse } from "next/server";

import { presignPut } from "@/lib/r2-client";
import {
  UploadValidationError,
  buildObjectKey,
  validatePresignRequest,
} from "@/lib/r2-upload";
import { requireUploadApiUser } from "@/lib/server-upload";

export async function handlePresignUpload(request: Request) {
  try {
    const user = await requireUploadApiUser();
    if (!user) {
      return NextResponse.json(
        { error: "يجب تسجيل الدخول أولًا." },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      purpose?: unknown;
      contentType?: unknown;
      fileName?: unknown;
      entityId?: unknown;
      size?: unknown;
    } | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "طلب الرفع غير صالح." }, { status: 400 });
    }

    const validated = validatePresignRequest({
      purpose: typeof body.purpose === "string" ? body.purpose : "",
      contentType: typeof body.contentType === "string" ? body.contentType : "",
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      size: typeof body.size === "number" ? body.size : Number(body.size),
      role: user.role,
    });

    const key = buildObjectKey({
      purpose: validated.purpose,
      ownerId: user.appUserId,
      extension: validated.extension,
      entityId: typeof body.entityId === "string" ? body.entityId : null,
    });

    const signed = await presignPut({
      key,
      contentType: validated.contentType,
      contentLength: validated.size,
    });

    return NextResponse.json({
      method: "PUT",
      uploadUrl: signed.uploadUrl,
      url: signed.url,
      key,
      headers: signed.headers,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تجهيز رفع الصورة.";
    const status = error instanceof UploadValidationError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
