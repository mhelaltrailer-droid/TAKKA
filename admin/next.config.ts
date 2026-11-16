import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin is Node-only and must not be bundled by Next.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
