import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { publicObjectUrl } from "./r2-upload";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

const MISSING_CONFIG_MESSAGE = "إعدادات تخزين الصور غير مكتملة.";

let cachedClient: S3Client | null = null;
let cachedKey = "";

export function readR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim() ?? "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() ?? "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() ?? "";
  const bucket = process.env.R2_BUCKET?.trim() ?? "";
  const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/u, "") ?? "";

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    throw new Error(MISSING_CONFIG_MESSAGE);
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function getR2Client(): S3Client {
  const config = readR2Config();
  const cacheKey = `${config.accountId}:${config.accessKeyId}:${config.bucket}`;
  if (cachedClient && cachedKey === cacheKey) {
    return cachedClient;
  }

  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // AWS SDK v3 adds default CRC32 checksums that R2 presigned browser PUTs
    // cannot send. Only sign a checksum when the caller asked for one.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  cachedKey = cacheKey;
  return cachedClient;
}

export function resetR2ClientForTests() {
  cachedClient = null;
  cachedKey = "";
}

export function r2PublicUrlForKey(key: string): string {
  return publicObjectUrl(readR2Config().publicUrl, key);
}

export async function presignPut(params: {
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ uploadUrl: string; url: string; headers: Record<string, string> }> {
  const config = readR2Config();
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: 10 * 60,
    // Content-Type is otherwise omitted from the signature, so R2 would store
    // the object without the image type the browser sends.
    signableHeaders: new Set(["content-type"]),
  });

  return {
    uploadUrl,
    url: publicObjectUrl(config.publicUrl, params.key),
    headers: {
      "Content-Type": params.contentType,
    },
  };
}

export async function putR2Object(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ url: string }> {
  const config = readR2Config();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ContentLength: params.body.byteLength,
    }),
  );

  return { url: publicObjectUrl(config.publicUrl, params.key) };
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  const config = readR2Config();
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
    return true;
  } catch (error) {
    if (isMissingObject(error)) {
      return false;
    }
    throw error;
  }
}

function isMissingObject(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const name = "name" in error ? String(error.name) : "";
  const metadata =
    "$metadata" in error && error.$metadata && typeof error.$metadata === "object"
      ? error.$metadata
      : null;
  const status =
    metadata && "httpStatusCode" in metadata
      ? Number(metadata.httpStatusCode)
      : 0;

  return name === "NotFound" || name === "NoSuchKey" || status === 404;
}
