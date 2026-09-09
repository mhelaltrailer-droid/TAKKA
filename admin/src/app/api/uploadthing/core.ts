import { createUploadthing, type FileRouter } from "uploadthing/next";

import { requireAuth, requireRole } from "@/lib/auth";

const f = createUploadthing();

export const uploadRouter = {
  kitchenLogo: f({
    image: {
      maxFileCount: 1,
      maxFileSize: "4MB",
    },
  })
    .middleware(async () => {
      const user = await requireAuth();

      return {
        userId: user.appUserId,
      };
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
      const user = await requireAuth();

      return {
        userId: user.appUserId,
      };
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
      const user = await requireAuth();

      return {
        userId: user.appUserId,
      };
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
      const user = await requireAuth();

      return {
        userId: user.appUserId,
      };
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
      const user = await requireAuth();

      return {
        userId: user.appUserId,
      };
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
      const user = await requireAuth();

      return {
        userId: user.appUserId,
      };
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
      const user = await requireRole(["admin"]);

      return {
        userId: user.appUserId,
      };
    })
    .onUploadComplete(async ({ file, metadata }) => {
      return {
        uploadedBy: metadata.userId,
        url: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
