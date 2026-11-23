import { db } from "@/lib/db";
import {
  IMAGE_DISPLAY_SETTINGS_DEFAULTS,
  IMAGE_DISPLAY_SETTINGS_ID,
  type ImageDisplaySettingsValues,
  isWatermarkPosition,
  parseImageDisplaySettingsInput,
} from "@/lib/image-settings";

const CACHE_MS = 15_000;

let cached: { value: ImageDisplaySettingsValues; expiresAt: number } | null =
  null;

export function clearImageDisplaySettingsCache() {
  cached = null;
}

function fromRow(row: {
  watermarkEnabled: boolean;
  enhancementEnabled: boolean;
  watermarkPosition: string;
}): ImageDisplaySettingsValues {
  return {
    watermarkEnabled: row.watermarkEnabled,
    enhancementEnabled: row.enhancementEnabled,
    watermarkPosition: isWatermarkPosition(row.watermarkPosition)
      ? row.watermarkPosition
      : IMAGE_DISPLAY_SETTINGS_DEFAULTS.watermarkPosition,
  };
}

export async function getImageDisplaySettings(): Promise<ImageDisplaySettingsValues> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existing = await db.imageDisplaySettings.findUnique({
    where: { id: IMAGE_DISPLAY_SETTINGS_ID },
  });

  let row = existing;
  if (!row) {
    try {
      row = await db.imageDisplaySettings.create({
        data: {
          id: IMAGE_DISPLAY_SETTINGS_ID,
          ...IMAGE_DISPLAY_SETTINGS_DEFAULTS,
        },
      });
    } catch {
      row = await db.imageDisplaySettings.findUnique({
        where: { id: IMAGE_DISPLAY_SETTINGS_ID },
      });
    }
  }

  if (!row) {
    // Fail soft for public clients: defaults keep the app usable.
    const value = { ...IMAGE_DISPLAY_SETTINGS_DEFAULTS };
    cached = { value, expiresAt: Date.now() + CACHE_MS };
    return value;
  }

  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

export async function saveImageDisplaySettings(
  raw: Record<string, unknown>,
): Promise<
  { ok: true; value: ImageDisplaySettingsValues } | { ok: false; error: string }
> {
  const parsed = parseImageDisplaySettingsInput(raw);
  if (!parsed.ok) {
    return parsed;
  }

  const row = await db.imageDisplaySettings.upsert({
    where: { id: IMAGE_DISPLAY_SETTINGS_ID },
    create: {
      id: IMAGE_DISPLAY_SETTINGS_ID,
      ...parsed.value,
    },
    update: parsed.value,
  });
  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return { ok: true, value };
}
