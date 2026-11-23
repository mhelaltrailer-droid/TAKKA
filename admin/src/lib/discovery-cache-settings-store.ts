import { db } from "@/lib/db";
import {
  DISCOVERY_CACHE_SETTINGS_DEFAULTS,
  DISCOVERY_CACHE_SETTINGS_ID,
  parseDiscoveryCacheSettingsInput,
  type DiscoveryCacheSettingsValues,
} from "@/lib/discovery-cache-settings";

const META_CACHE_MS = 15_000;

let cached: {
  value: DiscoveryCacheSettingsValues;
  expiresAt: number;
} | null = null;

export function clearDiscoveryCacheSettingsCache() {
  cached = null;
}

function fromRow(row: {
  cacheEnabled: boolean;
  ttlSeconds: number;
}): DiscoveryCacheSettingsValues {
  return {
    cacheEnabled: row.cacheEnabled,
    ttlSeconds: row.ttlSeconds,
  };
}

export async function getDiscoveryCacheSettings(): Promise<DiscoveryCacheSettingsValues> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const existing = await db.discoveryCacheSettings.findUnique({
    where: { id: DISCOVERY_CACHE_SETTINGS_ID },
  });

  let row = existing;
  if (!row) {
    try {
      row = await db.discoveryCacheSettings.create({
        data: {
          id: DISCOVERY_CACHE_SETTINGS_ID,
          ...DISCOVERY_CACHE_SETTINGS_DEFAULTS,
        },
      });
    } catch {
      row = await db.discoveryCacheSettings.findUnique({
        where: { id: DISCOVERY_CACHE_SETTINGS_ID },
      });
    }
  }

  if (!row) {
    const value = { ...DISCOVERY_CACHE_SETTINGS_DEFAULTS };
    cached = { value, expiresAt: Date.now() + META_CACHE_MS };
    return value;
  }

  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + META_CACHE_MS };
  return value;
}

export async function saveDiscoveryCacheSettings(
  raw: Record<string, unknown>,
): Promise<
  | { ok: true; value: DiscoveryCacheSettingsValues }
  | { ok: false; error: string }
> {
  const parsed = parseDiscoveryCacheSettingsInput(raw);
  if (!parsed.ok) {
    return parsed;
  }

  const row = await db.discoveryCacheSettings.upsert({
    where: { id: DISCOVERY_CACHE_SETTINGS_ID },
    create: {
      id: DISCOVERY_CACHE_SETTINGS_ID,
      ...parsed.value,
    },
    update: parsed.value,
  });
  const value = fromRow(row);
  cached = { value, expiresAt: Date.now() + META_CACHE_MS };
  return { ok: true, value };
}
