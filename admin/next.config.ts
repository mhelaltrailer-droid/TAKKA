import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const R2_PUBLIC_HOST_FALLBACK = "pub-35d18718f36741e68738b3fd193e189e.r2.dev";

function r2PublicHostname() {
  const raw = process.env.R2_PUBLIC_URL?.trim();
  if (!raw) {
    return R2_PUBLIC_HOST_FALLBACK;
  }

  try {
    return new URL(raw).hostname || R2_PUBLIC_HOST_FALLBACK;
  } catch {
    return R2_PUBLIC_HOST_FALLBACK;
  }
}

/**
 * Client-side DSN wiring (documented in HANDOFF.md § Sentry):
 * Map server env `Sentry_key` (or `SENTRY_DSN`) → `NEXT_PUBLIC_SENTRY_DSN` at
 * build time via next.config `env`. Prefer this over a server-rendered prop so
 * instrumentation-client.ts can init without an extra round trip. If none are
 * set, the value is empty and Sentry stays fully disabled.
 */
const sentryDsnForClient =
  process.env.Sentry_key?.trim() ||
  process.env.SENTRY_DSN?.trim() ||
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
  "";

const nextConfig: NextConfig = {
  // firebase-admin and the AWS SDK are Node-only and must not be bundled by Next.
  serverExternalPackages: [
    "firebase-admin",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
  env: {
    NEXT_PUBLIC_SENTRY_DSN: sentryDsnForClient,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2PublicHostname(),
      },
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
      {
        protocol: "https",
        hostname: "uploadthing.com",
      },
      {
        protocol: "https",
        hostname: "*.uploadthing.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // No org / project / authToken — do not upload source maps.
  // Build must succeed without SENTRY_AUTH_TOKEN.
  silent: true,
  sourcemaps: {
    disable: true,
  },
  release: {
    create: false,
  },
});
