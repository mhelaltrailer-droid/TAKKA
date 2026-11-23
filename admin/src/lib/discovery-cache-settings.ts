/**
 * Discovery feed cache seed/parse helpers.
 * Singleton DB row edited at /dashboard/admin/discovery-cache.
 */

export const DISCOVERY_CACHE_SETTINGS_ID = "default";

export type DiscoveryCacheSettingsValues = {
  cacheEnabled: boolean;
  /** Seconds. Clamped 1–600 on parse. */
  ttlSeconds: number;
};

export const DISCOVERY_CACHE_SETTINGS_DEFAULTS: DiscoveryCacheSettingsValues = {
  cacheEnabled: true,
  ttlSeconds: 60,
};

export const DISCOVERY_CACHE_TTL_MIN = 1;
export const DISCOVERY_CACHE_TTL_MAX = 600;

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

export function parseDiscoveryCacheSettingsInput(
  raw: Record<string, unknown>,
):
  | { ok: true; value: DiscoveryCacheSettingsValues }
  | { ok: false; error: string } {
  const cacheEnabled = asBool(
    raw.cacheEnabled,
    DISCOVERY_CACHE_SETTINGS_DEFAULTS.cacheEnabled,
  );

  const ttlRaw =
    typeof raw.ttlSeconds === "number"
      ? raw.ttlSeconds
      : Number.parseInt(String(raw.ttlSeconds ?? "").trim(), 10);

  if (
    !Number.isFinite(ttlRaw) ||
    ttlRaw < DISCOVERY_CACHE_TTL_MIN ||
    ttlRaw > DISCOVERY_CACHE_TTL_MAX
  ) {
    return {
      ok: false,
      error: `مدة التخزين المؤقت لازم تكون بين ${DISCOVERY_CACHE_TTL_MIN} و ${DISCOVERY_CACHE_TTL_MAX} ثانية.`,
    };
  }

  return {
    ok: true,
    value: {
      cacheEnabled,
      ttlSeconds: Math.floor(ttlRaw),
    },
  };
}
