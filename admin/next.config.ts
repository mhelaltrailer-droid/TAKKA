import type { NextConfig } from "next";

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

const nextConfig: NextConfig = {
  // firebase-admin and the AWS SDK are Node-only and must not be bundled by Next.
  serverExternalPackages: [
    "firebase-admin",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-request-presigner",
  ],
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

export default nextConfig;
