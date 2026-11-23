import * as Sentry from "@sentry/nextjs";

/**
 * Client DSN comes from NEXT_PUBLIC_SENTRY_DSN, which next.config maps at build
 * time from `Sentry_key` (or `SENTRY_DSN`). No session replay.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    tracesSampleRate: 0.1,
    // SDK v11: equivalent of sendDefaultPii: false
    dataCollection: { userInfo: false },
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() ||
      process.env.NODE_ENV ||
      "development",
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
