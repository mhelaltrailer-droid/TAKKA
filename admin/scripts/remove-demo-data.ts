import { PrismaClient } from "@prisma/client";

import { removeDemoMarketplace } from "../src/lib/demo-seed";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  const prisma = new PrismaClient();
  try {
    const report = await removeDemoMarketplace(prisma);
    if (report.blocked.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
