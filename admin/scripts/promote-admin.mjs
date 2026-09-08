import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const identifier = process.argv[2];

  if (!identifier) {
    throw new Error(
      "Usage: npm run admin:promote -- <email-or-clerk-user-id-or-user-id>",
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { id: identifier },
        { email: identifier },
        { clerkUserId: identifier },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      clerkUserId: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      role: UserRole.ADMIN,
    },
  });

  console.log(
    `Promoted ${user.fullName} (${user.email ?? user.clerkUserId ?? user.id}) to ADMIN.`,
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
