import { auth } from "@clerk/nextjs/server";
import { UserRole } from "@prisma/client";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { db } from "@/lib/db";

const f = createUploadthing();

async function requireUploadUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new UploadThingError("يجب تسجيل الدخول أولًا.");
  }

  return userId;
}

async function requireAdminUploadUser() {
  const clerkUserId = await requireUploadUserId();
  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: { id: true, role: true },
  });

  if (!user || user.role !== UserRole.ADMIN) {
    throw new UploadThingError("غير مصرح برفع هذا الملف.");
  }

  return user.id;
}

export const uploadRouter = {
  kitchenLogo: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "4MB",
    },
  })
    .middleware(async () => {
      const userId = await requireUploadUserId();
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),

  kitchenCover: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => {
      const userId = await requireUploadUserId();
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),

  kitchenDocument: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => {
      const userId = await requireUploadUserId();
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),

  menuItemImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => {
      const userId = await requireUploadUserId();
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),

  depositProofImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => {
      const userId = await requireUploadUserId();
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),

  chatImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => {
      const userId = await requireUploadUserId();
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),

  promoBannerImage: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "8MB",
    },
  })
    .middleware(async () => {
      const userId = await requireAdminUploadUser();
      return { userId };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
