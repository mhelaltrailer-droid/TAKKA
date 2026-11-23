/**
 * Image pipeline constants + ImageDisplaySettings seed/parse helpers.
 * Compression and crop ratios are fixed product rules; watermark /
 * enhancement toggles are admin-editable (singleton DB row).
 */

export const IMAGE_DISPLAY_SETTINGS_ID = "default";

/** Long-edge cap for all uploads (px). */
export const IMAGE_MAX_LONG_EDGE = 1280;

/** JPEG/WebP export quality (~0–1 client, 0–100 Sharp). */
export const IMAGE_EXPORT_QUALITY = 0.75;
export const IMAGE_EXPORT_QUALITY_PERCENT = 75;

/**
 * Uniform crop ratios (width:height) for food / branding photos.
 * Documents, deposit proofs, and chat images are resize-only.
 */
export const IMAGE_ASPECT_RATIOS = {
  menuItemImage: 4 / 3,
  kitchenCover: 16 / 9,
  kitchenLogo: 1,
} as const;

export type CroppableUploadPurpose = keyof typeof IMAGE_ASPECT_RATIOS;

export const FOOD_ENHANCE_PURPOSES = new Set<string>([
  "menuItemImage",
  "kitchenCover",
]);

export type WatermarkPosition =
  | "bottomLeft"
  | "bottomRight"
  | "topLeft"
  | "topRight";

export const WATERMARK_POSITIONS: WatermarkPosition[] = [
  "bottomLeft",
  "bottomRight",
  "topLeft",
  "topRight",
];

export type ImageDisplaySettingsValues = {
  watermarkEnabled: boolean;
  enhancementEnabled: boolean;
  watermarkPosition: WatermarkPosition;
};

export const IMAGE_DISPLAY_SETTINGS_DEFAULTS: ImageDisplaySettingsValues = {
  watermarkEnabled: true,
  enhancementEnabled: true,
  watermarkPosition: "bottomLeft",
};

export function isCroppableUploadPurpose(
  purpose: string,
): purpose is CroppableUploadPurpose {
  return Object.prototype.hasOwnProperty.call(IMAGE_ASPECT_RATIOS, purpose);
}

export function aspectRatioForPurpose(purpose: string): number | null {
  if (!isCroppableUploadPurpose(purpose)) {
    return null;
  }
  return IMAGE_ASPECT_RATIOS[purpose];
}

export function isFoodEnhancePurpose(purpose: string): boolean {
  return FOOD_ENHANCE_PURPOSES.has(purpose);
}

export function isWatermarkPosition(value: unknown): value is WatermarkPosition {
  return (
    typeof value === "string" &&
    (WATERMARK_POSITIONS as string[]).includes(value)
  );
}

function asBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "on" || v === "yes") {
      return true;
    }
    if (v === "false" || v === "0" || v === "off" || v === "no") {
      return false;
    }
  }
  return fallback;
}

export function parseImageDisplaySettingsInput(
  raw: Record<string, unknown>,
):
  | { ok: true; value: ImageDisplaySettingsValues }
  | { ok: false; error: string } {
  const watermarkEnabled = asBool(
    raw.watermarkEnabled,
    IMAGE_DISPLAY_SETTINGS_DEFAULTS.watermarkEnabled,
  );
  const enhancementEnabled = asBool(
    raw.enhancementEnabled,
    IMAGE_DISPLAY_SETTINGS_DEFAULTS.enhancementEnabled,
  );
  const positionRaw = raw.watermarkPosition;
  if (!isWatermarkPosition(positionRaw)) {
    return {
      ok: false,
      error: "موضع العلامة المائية غير صالح.",
    };
  }

  return {
    ok: true,
    value: {
      watermarkEnabled,
      enhancementEnabled,
      watermarkPosition: positionRaw,
    },
  };
}

/**
 * Pure geometry helper: center-crop rectangle for a target aspect (w/h).
 * Used by client prepare + unit tests.
 */
export function centerCropRect(
  width: number,
  height: number,
  aspect: number,
): { x: number; y: number; width: number; height: number } {
  if (width <= 0 || height <= 0 || aspect <= 0) {
    return { x: 0, y: 0, width: Math.max(0, width), height: Math.max(0, height) };
  }

  const srcAspect = width / height;
  let cropW: number;
  let cropH: number;
  if (srcAspect > aspect) {
    cropH = height;
    cropW = Math.max(1, Math.round(cropH * aspect));
  } else {
    cropW = width;
    cropH = Math.max(1, Math.round(cropW / aspect));
  }

  const x = Math.max(0, Math.floor((width - cropW) / 2));
  const y = Math.max(0, Math.floor((height - cropH) / 2));
  return { x, y, width: cropW, height: cropH };
}

/** Scale so the long edge is at most maxEdge (no upscale). */
export function fitInsideMaxEdge(
  width: number,
  height: number,
  maxEdge: number = IMAGE_MAX_LONG_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxEdge <= 0) {
    return { width: Math.max(0, width), height: Math.max(0, height) };
  }
  const long = Math.max(width, height);
  if (long <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
