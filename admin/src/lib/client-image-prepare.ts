/**
 * Browser-side resize + center-crop before presigned R2 PUT.
 * Enhancement is intentionally skipped on web (Flutter does on-device enhance).
 */

import {
  IMAGE_EXPORT_QUALITY,
  IMAGE_MAX_LONG_EDGE,
  aspectRatioForPurpose,
  centerCropRect,
  fitInsideMaxEdge,
} from "@/lib/image-settings";

function baseName(fileName: string): string {
  const trimmed = fileName.trim() || "image";
  return trimmed.replace(/\.[^.]+$/u, "") || "image";
}

async function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
): Promise<File> {
  const preferWebp =
    typeof HTMLCanvasElement !== "undefined" &&
    canvas.toDataURL("image/webp").startsWith("data:image/webp");

  const mime = preferWebp ? "image/webp" : "image/jpeg";
  const ext = preferWebp ? "webp" : "jpg";

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), mime, IMAGE_EXPORT_QUALITY);
  });

  if (!blob) {
    throw new Error("تعذر ضغط الصورة قبل الرفع.");
  }

  return new File([blob], `${baseName(fileName)}.${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });
}

/**
 * Resize (max long edge 1280) and optionally center-crop to the purpose ratio.
 * Non-image files are returned unchanged.
 */
export async function prepareImageForUpload(
  file: File,
  purpose: string,
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Let the server / R2 validation reject bad bytes; don't block upload.
    return file;
  }

  try {
    const aspect = aspectRatioForPurpose(purpose);
    const crop = aspect
      ? centerCropRect(bitmap.width, bitmap.height, aspect)
      : {
          x: 0,
          y: 0,
          width: bitmap.width,
          height: bitmap.height,
        };
    const fitted = fitInsideMaxEdge(crop.width, crop.height, IMAGE_MAX_LONG_EDGE);

    const canvas = document.createElement("canvas");
    canvas.width = fitted.width;
    canvas.height = fitted.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    ctx.drawImage(
      bitmap,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      fitted.width,
      fitted.height,
    );

    return await canvasToFile(canvas, file.name);
  } finally {
    bitmap.close();
  }
}
