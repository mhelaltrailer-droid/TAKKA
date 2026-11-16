import { PrismaClient } from "@prisma/client";

import { seedDemoMarketplace } from "../src/lib/demo-seed";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }
  const prisma = new PrismaClient();
  try {
    await seedDemoMarketplace(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
