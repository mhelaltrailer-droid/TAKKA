import { db } from "@/lib/db";
import { putR2Object, r2ObjectExists, r2PublicUrlForKey, readR2Config } from "@/lib/r2-client";
import {
  classifyStoredImageUrl,
  migrationKeyForUrl,
} from "@/lib/r2-upload";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type MigrationSummary = {
  dryRun: boolean;
  scanned: number;
  empty: number;
  alreadyR2: number;
  notUploadThing: number;
  invalid: number;
  candidates: number;
  processed: number;
  copied: number;
  alreadyStored: number;
  rewritten: number;
  skipped: number;
  failed: number;
  remaining: number;
  errors: { url: string; message: string }[];
};

type ImageRef = {
  table:
    | "kitchen"
    | "kitchenDocument"
    | "kitchenGalleryImage"
    | "menuItem"
    | "depositProof"
    | "orderMessage"
    | "promoBanner";
  id: string;
  field: "logoUrl" | "coverImageUrl" | "fileUrl" | "imageUrl" | "pendingImageUrl";
  url: string;
};

function pushUrl(
  refs: ImageRef[],
  ref: Omit<ImageRef, "url">,
  url: string | null | undefined,
) {
  if (url == null) {
    return;
  }
  refs.push({ ...ref, url });
}

async function collectImageRefs(): Promise<ImageRef[]> {
  const [kitchens, documents, gallery, menuItems, proofs, messages, promos] =
    await Promise.all([
      db.kitchen.findMany({
        select: { id: true, logoUrl: true, coverImageUrl: true },
      }),
      db.kitchenDocument.findMany({
        select: { id: true, fileUrl: true },
      }),
      db.kitchenGalleryImage.findMany({
        select: { id: true, imageUrl: true },
      }),
      db.menuItem.findMany({
        select: { id: true, imageUrl: true, pendingImageUrl: true },
      }),
      db.depositProof.findMany({
        select: { id: true, imageUrl: true },
      }),
      db.orderMessage.findMany({
        select: { id: true, fileUrl: true },
      }),
      db.promoBanner.findMany({
        select: { id: true, imageUrl: true },
      }),
    ]);

  const refs: ImageRef[] = [];

  for (const row of kitchens) {
    pushUrl(refs, { table: "kitchen", id: row.id, field: "logoUrl" }, row.logoUrl);
    pushUrl(
      refs,
      { table: "kitchen", id: row.id, field: "coverImageUrl" },
      row.coverImageUrl,
    );
  }

  for (const row of documents) {
    pushUrl(
      refs,
      { table: "kitchenDocument", id: row.id, field: "fileUrl" },
      row.fileUrl,
    );
  }

  for (const row of gallery) {
    pushUrl(
      refs,
      { table: "kitchenGalleryImage", id: row.id, field: "imageUrl" },
      row.imageUrl,
    );
  }

  for (const row of menuItems) {
    pushUrl(
      refs,
      { table: "menuItem", id: row.id, field: "imageUrl" },
      row.imageUrl,
    );
    pushUrl(
      refs,
      { table: "menuItem", id: row.id, field: "pendingImageUrl" },
      row.pendingImageUrl,
    );
  }

  for (const row of proofs) {
    pushUrl(
      refs,
      { table: "depositProof", id: row.id, field: "imageUrl" },
      row.imageUrl,
    );
  }

  for (const row of messages) {
    pushUrl(
      refs,
      { table: "orderMessage", id: row.id, field: "fileUrl" },
      row.fileUrl,
    );
  }

  for (const row of promos) {
    pushUrl(
      refs,
      { table: "promoBanner", id: row.id, field: "imageUrl" },
      row.imageUrl,
    );
  }

  return refs;
}

async function rewriteUrl(ref: ImageRef, nextUrl: string): Promise<number> {
  switch (ref.table) {
    case "kitchen":
      if (ref.field === "logoUrl") {
        const result = await db.kitchen.updateMany({
          where: { id: ref.id, logoUrl: ref.url },
          data: { logoUrl: nextUrl },
        });
        return result.count;
      }
      if (ref.field === "coverImageUrl") {
        const result = await db.kitchen.updateMany({
          where: { id: ref.id, coverImageUrl: ref.url },
          data: { coverImageUrl: nextUrl },
        });
        return result.count;
      }
      return 0;
    case "kitchenDocument":
      if (ref.field !== "fileUrl") {
        return 0;
      }
      return (
        await db.kitchenDocument.updateMany({
          where: { id: ref.id, fileUrl: ref.url },
          data: { fileUrl: nextUrl },
        })
      ).count;
    case "kitchenGalleryImage":
      if (ref.field !== "imageUrl") {
        return 0;
      }
      return (
        await db.kitchenGalleryImage.updateMany({
          where: { id: ref.id, imageUrl: ref.url },
          data: { imageUrl: nextUrl },
        })
      ).count;
    case "menuItem":
      if (ref.field === "imageUrl") {
        return (
          await db.menuItem.updateMany({
            where: { id: ref.id, imageUrl: ref.url },
            data: { imageUrl: nextUrl },
          })
        ).count;
      }
      if (ref.field === "pendingImageUrl") {
        return (
          await db.menuItem.updateMany({
            where: { id: ref.id, pendingImageUrl: ref.url },
            data: { pendingImageUrl: nextUrl },
          })
        ).count;
      }
      return 0;
    case "depositProof":
      if (ref.field !== "imageUrl") {
        return 0;
      }
      return (
        await db.depositProof.updateMany({
          where: { id: ref.id, imageUrl: ref.url },
          data: { imageUrl: nextUrl },
        })
      ).count;
    case "orderMessage":
      if (ref.field !== "fileUrl") {
        return 0;
      }
      return (
        await db.orderMessage.updateMany({
          where: { id: ref.id, fileUrl: ref.url },
          data: { fileUrl: nextUrl },
        })
      ).count;
    case "promoBanner":
      if (ref.field !== "imageUrl") {
        return 0;
      }
      return (
        await db.promoBanner.updateMany({
          where: { id: ref.id, imageUrl: ref.url },
          data: { imageUrl: nextUrl },
        })
      ).count;
    default:
      return 0;
  }
}

async function copyUploadThingObject(sourceUrl: string, key: string) {
  if (await r2ObjectExists(key)) {
    return { url: r2PublicUrlForKey(key), alreadyStored: true };
  }

  const response = await fetch(sourceUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`تعذر تنزيل الصورة (${response.status}).`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error("الملف المنزّل فارغ.");
  }

  const headerType = response.headers.get("content-type")?.split(";")[0]?.trim();
  const contentType =
    headerType && headerType.startsWith("image/") ? headerType : "image/webp";

  const stored = await putR2Object({
    key,
    body: bytes,
    contentType,
  });

  return { url: stored.url, alreadyStored: false };
}

function emptySummary(dryRun: boolean): MigrationSummary {
  return {
    dryRun,
    scanned: 0,
    empty: 0,
    alreadyR2: 0,
    notUploadThing: 0,
    invalid: 0,
    candidates: 0,
    processed: 0,
    copied: 0,
    alreadyStored: 0,
    rewritten: 0,
    skipped: 0,
    failed: 0,
    remaining: 0,
    errors: [],
  };
}

function pushError(
  summary: MigrationSummary,
  url: string,
  message: string,
) {
  if (summary.errors.length < 20) {
    summary.errors.push({ url, message });
  }
}

export async function migrateUploadThingImages(options: {
  dryRun: boolean;
  limit?: number;
}): Promise<MigrationSummary> {
  const dryRun = options.dryRun;
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Math.floor(options.limit ?? DEFAULT_LIMIT)),
  );
  const summary = emptySummary(dryRun);
  const publicBase = process.env.R2_PUBLIC_URL?.trim() || null;

  if (!dryRun) {
    readR2Config();
  }

  const refs = await collectImageRefs();
  summary.scanned = refs.length;

  const candidates: Array<ImageRef & { key: string; sourceUrl: string }> = [];

  for (const ref of refs) {
    const sourceUrl = ref.url.trim();
    const kind = classifyStoredImageUrl(ref.url, publicBase);

    if (kind === "empty") {
      summary.empty += 1;
      continue;
    }
    if (kind === "r2") {
      summary.alreadyR2 += 1;
      continue;
    }
    if (kind === "other") {
      summary.notUploadThing += 1;
      continue;
    }
    if (kind === "invalid-uploadthing") {
      summary.invalid += 1;
      summary.failed += 1;
      pushError(summary, sourceUrl, "تعذر استخراج مفتاح الملف.");
      continue;
    }

    const key = migrationKeyForUrl(sourceUrl);
    if (!key) {
      summary.invalid += 1;
      summary.failed += 1;
      pushError(summary, sourceUrl, "تعذر استخراج مفتاح الملف.");
      continue;
    }

    candidates.push({ ...ref, key, sourceUrl });
  }

  summary.candidates = candidates.length;
  summary.remaining = candidates.length;

  if (dryRun) {
    return summary;
  }

  const batch = candidates.slice(0, limit);
  summary.remaining = candidates.length - batch.length;

  const ready = new Map<string, { url: string } | { error: string }>();

  for (const item of batch) {
    summary.processed += 1;
    let resolved = ready.get(item.sourceUrl);

    if (!resolved) {
      try {
        const copied = await copyUploadThingObject(item.sourceUrl, item.key);
        if (copied.alreadyStored) {
          summary.alreadyStored += 1;
        } else {
          summary.copied += 1;
        }
        resolved = { url: copied.url };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "تعذر نسخ الصورة.";
        resolved = { error: message };
        pushError(summary, item.sourceUrl, message);
      }
      ready.set(item.sourceUrl, resolved);
    }

    if ("error" in resolved) {
      summary.failed += 1;
      continue;
    }

    const updated = await rewriteUrl(item, resolved.url);
    if (updated > 0) {
      summary.rewritten += 1;
    } else {
      summary.skipped += 1;
    }
  }

  return summary;
}
