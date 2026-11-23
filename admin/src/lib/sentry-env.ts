/**
 * Resolve the Sentry DSN without throwing when unset.
 *
 * Priority: `Sentry_key` (Render) → `SENTRY_DSN` → `NEXT_PUBLIC_SENTRY_DSN`
 * (build-time client mapping from next.config).
 */
export function resolveSentryDsn(): string | undefined {
  for (const value of [
    process.env.Sentry_key,
    process.env.SENTRY_DSN,
    process.env.NEXT_PUBLIC_SENTRY_DSN,
  ]) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

/** Prefer Render service name, then NODE_ENV. */
export function resolveSentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT?.trim() ||
    process.env.RENDER_SERVICE_NAME?.trim() ||
    process.env.NODE_ENV ||
    "development"
  );
}
