import * as Sentry from "@sentry/nextjs";

import { resolveSentryDsn, resolveSentryEnvironment } from "@/lib/sentry-env";

const dsn = resolveSentryDsn();

if (dsn) {
  Sentry.init({
    dsn,
    enabled: true,
    tracesSampleRate: 0.1,
    // SDK v11: equivalent of sendDefaultPii: false
    dataCollection: { userInfo: false },
    environment: resolveSentryEnvironment(),
  });
}
