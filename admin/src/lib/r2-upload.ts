import { type AppRole } from "./roles";

/**
 * UploadThing's `image` file type, which every current file router uses.
 * jpeg/png/webp are called out explicitly; the rest match that router.
 */
export const ALLOWED_IMAGE_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
} as const;

export type AllowedImageContentType = keyof typeof ALLOWED_IMAGE_CONTENT_TYPES;

const EXTENSION_TO_CONTENT_TYPE: Record<string, AllowedImageContentType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  ico: "image/x-icon",
};

/** Same byte limits the UploadThing routers and /api/uploads enforce. */
export const UPLOAD_PURPOSES = {
  kitchenLogo: { maxBytes: 4 * 1024 * 1024, adminOnly: false },
  kitchenCover: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  kitchenDocument: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  menuItemImage: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  depositProofImage: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  chatImage: { maxBytes: 8 * 1024 * 1024, adminOnly: false },
  promoBannerImage: { maxBytes: 8 * 1024 * 1024, adminOnly: true },
} as const;

export type UploadPurpose = keyof typeof UPLOAD_PURPOSES;

const PURPOSE_PREFIX: Record<UploadPurpose, string> = {
  kitchenLogo: "kitchens",
  kitchenCover: "kitchens",
  kitchenDocument: "kitchens",
  menuItemImage: "menu-items",
  depositProofImage: "deposit-proofs",
  chatImage: "chat",
  promoBannerImage: "promos",
};

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

/** Client-facing upload validation errors (map to HTTP 400). */
export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

export function isUploadPurpose(value: string): value is UploadPurpose {
  return Object.prototype.hasOwnProperty.call(UPLOAD_PURPOSES, value);
}

export function normalizeContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function extensionFromFileName(fileName: string | undefined): string | null {
  if (!fileName) {
    return null;
  }

  const base = fileName.trim().split(/[/\\]/u).pop() ?? "";
  const match = /\.([A-Za-z0-9]{1,8})$/u.exec(base);
  return match?.[1]?.toLowerCase() ?? null;
}

export function resolveImageContentType(
  contentType: string,
  fileName?: string,
): { contentType: AllowedImageContentType; extension: string } | null {
  const normalized = normalizeContentType(contentType);
  if (normalized in ALLOWED_IMAGE_CONTENT_TYPES) {
    const allowed = normalized as AllowedImageContentType;
    return {
      contentType: allowed,
      extension: ALLOWED_IMAGE_CONTENT_TYPES[allowed],
    };
  }

  const generic =
    !normalized ||
    normalized === "application/octet-stream" ||
    normalized === "binary/octet-stream";

  if (!generic) {
    return null;
  }

  const extension = extensionFromFileName(fileName);
  if (!extension) {
    return null;
  }

  const inferred = EXTENSION_TO_CONTENT_TYPE[extension];
  if (!inferred) {
    return null;
  }

  return {
    contentType: inferred,
    extension: ALLOWED_IMAGE_CONTENT_TYPES[inferred],
  };
}

export function validatePresignRequest(input: {
  purpose: string;
  contentType: string;
  fileName?: string;
  size: number;
  role: AppRole;
}): {
  purpose: UploadPurpose;
  contentType: AllowedImageContentType;
  extension: string;
  size: number;
} {
  if (!isUploadPurpose(input.purpose)) {
    throw new UploadValidationError("غرض الرفع غير صالح.");
  }

  const config = UPLOAD_PURPOSES[input.purpose];
  if (config.adminOnly && input.role !== "admin") {
    throw new UploadValidationError("غير مصرح برفع هذا الملف.");
  }

  if (!Number.isFinite(input.size) || !Number.isInteger(input.size)) {
    throw new UploadValidationError("حجم الملف غير صالح.");
  }

  if (input.size <= 0) {
    throw new UploadValidationError("الملف فارغ.");
  }

  if (input.size > config.maxBytes) {
    const maxMb = Math.round(config.maxBytes / (1024 * 1024));
    throw new UploadValidationError(
      `حجم الصورة أكبر من الحد المسموح (${maxMb}MB).`,
    );
  }

  const resolved = resolveImageContentType(input.contentType, input.fileName);
  if (!resolved) {
    throw new UploadValidationError("يسمح برفع الصور فقط.");
  }

  return {
    purpose: input.purpose,
    contentType: resolved.contentType,
    extension: resolved.extension,
    size: input.size,
  };
}

function safePathId(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  if (!SAFE_ID.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function buildObjectKey(input: {
  purpose: UploadPurpose;
  ownerId: string;
  extension: string;
  entityId?: string | null;
  id?: string;
}): string {
  const scope = safePathId(input.entityId) ?? safePathId(input.ownerId);
  if (!scope) {
    throw new UploadValidationError("تعذر إنشاء مسار الملف.");
  }

  const extension = input.extension.trim().toLowerCase().replace(/^\./u, "");
  if (!/^[a-z0-9]{1,8}$/u.test(extension)) {
    throw new UploadValidationError("امتداد الملف غير صالح.");
  }

  const id = input.id ?? crypto.randomUUID();
  if (!/^[A-Za-z0-9-]{8,80}$/u.test(id)) {
    throw new UploadValidationError("تعذر إنشاء مسار الملف.");
  }

  return `${PURPOSE_PREFIX[input.purpose]}/${scope}/${id}.${extension}`;
}

export function publicObjectUrl(publicBase: string, key: string): string {
  const base = publicBase.trim().replace(/\/+$/u, "");
  const path = key
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `${base}/${path}`;
}

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isR2PublicUrl(
  url: string,
  publicBase: string | null | undefined,
): boolean {
  if (!publicBase) {
    return false;
  }

  const expected = hostnameOf(publicBase);
  const actual = hostnameOf(url);
  return Boolean(expected && actual && expected === actual);
}

export function isUploadThingUrl(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) {
    return false;
  }

  return (
    host === "utfs.io" ||
    host === "ufs.sh" ||
    host.endsWith(".ufs.sh") ||
    host === "uploadthing.com" ||
    host.endsWith(".uploadthing.com")
  );
}

/**
 * Stable R2 key for an UploadThing URL so the copy can be repeated safely.
 * Returns null when the host matches but the file key cannot be read.
 */
export function migrationKeyForUrl(rawUrl: string): string | null {
  if (!isUploadThingUrl(rawUrl)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const marker = parts.indexOf("f");
  const fileKey = marker >= 0 ? parts[marker + 1] : null;
  if (!fileKey) {
    return null;
  }

  const named = parts[marker + 2];
  const extFrom = (value: string | undefined) => {
    const match = /\.([A-Za-z0-9]{1,8})$/u.exec(value ?? "");
    return match?.[1]?.toLowerCase() ?? null;
  };

  const extension = extFrom(named) ?? extFrom(fileKey) ?? "webp";
  const host = url.hostname.toLowerCase().replace(/[^a-z0-9.-]/gu, "_");
  const base = fileKey
    .replace(/\.[A-Za-z0-9]{1,8}$/u, "")
    .replace(/[^A-Za-z0-9._-]/gu, "_")
    .slice(0, 180);

  if (!base) {
    return null;
  }

  return `migrated/${host}/${base}.${extension}`;
}

export type StoredImageClass =
  | "empty"
  | "r2"
  | "uploadthing"
  | "invalid-uploadthing"
  | "other";

export function classifyStoredImageUrl(
  url: string | null | undefined,
  publicBase?: string | null,
): StoredImageClass {
  const trimmed = url?.trim() ?? "";
  if (!trimmed) {
    return "empty";
  }

  if (isR2PublicUrl(trimmed, publicBase)) {
    return "r2";
  }

  if (!isUploadThingUrl(trimmed)) {
    return "other";
  }

  return migrationKeyForUrl(trimmed) ? "uploadthing" : "invalid-uploadthing";
}
