import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { presignPut, resetR2ClientForTests } from "./r2-client";
import {
  UploadValidationError,
  buildObjectKey,
  classifyStoredImageUrl,
  migrationKeyForUrl,
  publicObjectUrl,
  validatePresignRequest,
} from "./r2-upload";

const OWNER = "clh0owner123";
const PUBLIC_BASE = "https://pub-35d18718f36741e68738b3fd193e189e.r2.dev";

describe("validatePresignRequest", () => {
  it("accepts jpeg, png, and webp within the UploadThing size limits", () => {
    const jpeg = validatePresignRequest({
      purpose: "kitchenLogo",
      contentType: "image/jpeg",
      size: 4 * 1024 * 1024,
      role: "kitchen_owner",
    });
    assert.equal(jpeg.extension, "jpg");
    assert.equal(jpeg.contentType, "image/jpeg");

    const png = validatePresignRequest({
      purpose: "menuItemImage",
      contentType: "image/png; charset=binary",
      size: 8 * 1024 * 1024,
      role: "customer",
    });
    assert.equal(png.extension, "png");

    const webp = validatePresignRequest({
      purpose: "chatImage",
      contentType: "IMAGE/WEBP",
      size: 1024,
      role: "customer",
    });
    assert.equal(webp.contentType, "image/webp");
    assert.equal(webp.extension, "webp");
  });

  it("allows the other image types the UploadThing image routers accept", () => {
    for (const contentType of [
      "image/gif",
      "image/svg+xml",
      "image/avif",
      "image/heic",
      "image/heif",
      "image/bmp",
      "image/tiff",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ]) {
      const result = validatePresignRequest({
        purpose: "kitchenCover",
        contentType,
        size: 1000,
        role: "customer",
      });
      assert.equal(result.contentType, contentType);
    }
  });

  it("infers a type from the file name when the client omits one", () => {
    const result = validatePresignRequest({
      purpose: "depositProofImage",
      contentType: "",
      fileName: "proof.PNG",
      size: 10,
      role: "customer",
    });
    assert.equal(result.contentType, "image/png");
    assert.equal(result.extension, "png");
  });

  it("rejects non-images, empty files, unknown purposes, and oversize logos", () => {
    assert.throws(
      () =>
        validatePresignRequest({
          purpose: "kitchenLogo",
          contentType: "application/pdf",
          fileName: "doc.pdf",
          size: 100,
          role: "customer",
        }),
      (error: unknown) =>
        error instanceof UploadValidationError &&
        error.message === "يسمح برفع الصور فقط.",
    );

    assert.throws(
      () =>
        validatePresignRequest({
          purpose: "kitchenLogo",
          contentType: "image/jpeg",
          size: 0,
          role: "customer",
        }),
      /الملف فارغ/,
    );

    assert.throws(
      () =>
        validatePresignRequest({
          purpose: "avatar",
          contentType: "image/jpeg",
          size: 10,
          role: "customer",
        }),
      /غرض الرفع غير صالح/,
    );

    assert.throws(
      () =>
        validatePresignRequest({
          purpose: "kitchenLogo",
          contentType: "image/jpeg",
          size: 4 * 1024 * 1024 + 1,
          role: "kitchen_owner",
        }),
      /4MB/,
    );

    assert.throws(
      () =>
        validatePresignRequest({
          purpose: "menuItemImage",
          contentType: "image/jpeg",
          size: 8 * 1024 * 1024 + 1,
          role: "kitchen_owner",
        }),
      /8MB/,
    );
  });

  it("keeps promo banners admin-only and lets any signed-in role upload the rest", () => {
    assert.throws(
      () =>
        validatePresignRequest({
          purpose: "promoBannerImage",
          contentType: "image/webp",
          size: 100,
          role: "kitchen_owner",
        }),
      /غير مصرح برفع هذا الملف/,
    );

    const admin = validatePresignRequest({
      purpose: "promoBannerImage",
      contentType: "image/webp",
      size: 100,
      role: "admin",
    });
    assert.equal(admin.purpose, "promoBannerImage");

    assert.equal(
      validatePresignRequest({
        purpose: "kitchenDocument",
        contentType: "image/jpeg",
        size: 100,
        role: "customer",
      }).purpose,
      "kitchenDocument",
    );
  });
});

describe("buildObjectKey", () => {
  it("builds purpose prefixes with the owner and a unique id", () => {
    assert.equal(
      buildObjectKey({
        purpose: "kitchenLogo",
        ownerId: OWNER,
        extension: "jpg",
        id: "11111111-2222-4333-8444-555555555555",
      }),
      `kitchens/${OWNER}/11111111-2222-4333-8444-555555555555.jpg`,
    );

    assert.equal(
      buildObjectKey({
        purpose: "menuItemImage",
        ownerId: OWNER,
        extension: ".webp",
        id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      }),
      `menu-items/${OWNER}/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.webp`,
    );

    assert.equal(
      buildObjectKey({
        purpose: "depositProofImage",
        ownerId: OWNER,
        extension: "png",
        id: "bbbbbbbb-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      }).startsWith("deposit-proofs/"),
      true,
    );

    assert.equal(
      buildObjectKey({
        purpose: "chatImage",
        ownerId: OWNER,
        extension: "jpg",
        id: "cccccccc-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      }).startsWith("chat/"),
      true,
    );

    assert.equal(
      buildObjectKey({
        purpose: "promoBannerImage",
        ownerId: OWNER,
        extension: "jpg",
        id: "dddddddd-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      }).startsWith("promos/"),
      true,
    );
  });

  it("uses a safe entity id and ignores path tricks", () => {
    assert.equal(
      buildObjectKey({
        purpose: "kitchenCover",
        ownerId: OWNER,
        entityId: "kitchen_42",
        extension: "jpg",
        id: "11111111-2222-4333-8444-555555555555",
      }),
      "kitchens/kitchen_42/11111111-2222-4333-8444-555555555555.jpg",
    );

    assert.equal(
      buildObjectKey({
        purpose: "kitchenCover",
        ownerId: OWNER,
        entityId: "../secrets",
        extension: "jpg",
        id: "11111111-2222-4333-8444-555555555555",
      }),
      `kitchens/${OWNER}/11111111-2222-4333-8444-555555555555.jpg`,
    );
  });

  it("joins the public base and the key without double slashes", () => {
    const key = buildObjectKey({
      purpose: "kitchenDocument",
      ownerId: OWNER,
      extension: "jpg",
      id: "11111111-2222-4333-8444-555555555555",
    });
    assert.equal(
      publicObjectUrl(`${PUBLIC_BASE}/`, key),
      `${PUBLIC_BASE}/${key}`,
    );
  });
});

describe("migration keys", () => {
  it("classifies UploadThing, R2, and unrelated URLs", () => {
    assert.equal(classifyStoredImageUrl("  ", PUBLIC_BASE), "empty");
    assert.equal(
      classifyStoredImageUrl(
        "https://images.pexels.com/photos/6287525/pexels-photo-6287525.jpeg",
        PUBLIC_BASE,
      ),
      "other",
    );
    assert.equal(
      classifyStoredImageUrl(`${PUBLIC_BASE}/kitchens/a/b.jpg`, PUBLIC_BASE),
      "r2",
    );
    assert.equal(
      classifyStoredImageUrl("https://utfs.io/f/abc123", PUBLIC_BASE),
      "uploadthing",
    );
    assert.equal(
      classifyStoredImageUrl("https://utfs.io/not-a-file", PUBLIC_BASE),
      "invalid-uploadthing",
    );
  });

  it("builds a stable key from UploadThing hosts", () => {
    assert.equal(
      migrationKeyForUrl("https://utfs.io/f/abc123"),
      "migrated/utfs.io/abc123.webp",
    );
    assert.equal(
      migrationKeyForUrl("https://utfs.io/f/abc123.png"),
      "migrated/utfs.io/abc123.png",
    );
    assert.equal(
      migrationKeyForUrl("https://appid.ufs.sh/f/fileKey/photo.JPEG?w=100"),
      "migrated/appid.ufs.sh/fileKey.jpeg",
    );
    assert.equal(
      migrationKeyForUrl("https://uploadthing.com/f/abc123.webp"),
      migrationKeyForUrl("https://uploadthing.com/f/abc123.webp"),
    );
    assert.equal(migrationKeyForUrl("https://example.com/f/abc123"), null);
    assert.equal(
      migrationKeyForUrl("https://utfs.io/f/abc123.png"),
      migrationKeyForUrl("https://utfs.io/f/abc123.png"),
    );
  });
});

describe("presignPut", () => {
  it("returns a public URL and a PUT URL that does not require a checksum header", async () => {
    const previous = {
      R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
      R2_BUCKET: process.env.R2_BUCKET,
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    };
    process.env.R2_ACCOUNT_ID = "account-id";
    process.env.R2_ACCESS_KEY_ID = "access-key";
    process.env.R2_SECRET_ACCESS_KEY = "secret-key";
    process.env.R2_BUCKET = "takka-media";
    process.env.R2_PUBLIC_URL = PUBLIC_BASE;
    resetR2ClientForTests();

    try {
      const signed = await presignPut({
        key: `kitchens/${OWNER}/11111111-2222-4333-8444-555555555555.jpg`,
        contentType: "image/jpeg",
        contentLength: 128,
      });

      assert.equal(
        signed.url,
        `${PUBLIC_BASE}/kitchens/${OWNER}/11111111-2222-4333-8444-555555555555.jpg`,
      );
      assert.equal(signed.headers["Content-Type"], "image/jpeg");
      const signedUrl = new URL(signed.uploadUrl);
      assert.equal(
        signedUrl.host,
        "takka-media.account-id.r2.cloudflarestorage.com",
      );
      assert.match(signed.uploadUrl, /X-Amz-Signature=/);
      assert.equal(
        signedUrl.searchParams.get("X-Amz-SignedHeaders"),
        "content-length;content-type;host",
      );
      assert.doesNotMatch(signed.uploadUrl, /checksum/i);
      assert.equal(signed.headers["x-amz-checksum-crc32"], undefined);
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      resetR2ClientForTests();
    }
  });
});
