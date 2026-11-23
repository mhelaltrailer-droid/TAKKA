"use client";

import { useId, useRef, useState } from "react";

import { prepareImageForUpload } from "@/lib/client-image-prepare";
import { IMAGE_MAX_LONG_EDGE } from "@/lib/image-settings";

type UploadFieldProps = {
  endpoint:
    | "kitchenLogo"
    | "kitchenCover"
    | "kitchenDocument"
    | "menuItemImage"
    | "depositProofImage"
    | "chatImage"
    | "promoBannerImage";
  inputName?: string;
  label: string;
  defaultValue?: string | null;
  helpText?: string;
  buttonLabel?: string;
  onUploaded?: (url: string) => void;
  /** When false, no hidden form input is rendered (controlled usage). */
  includeHiddenInput?: boolean;
};

type PresignResponse = {
  uploadUrl?: string;
  url?: string;
  headers?: Record<string, string>;
  error?: string;
};

async function requestPresign(file: File, purpose: string): Promise<{
  uploadUrl: string;
  url: string;
  headers?: Record<string, string>;
}> {
  let response: Response;
  try {
    response = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose,
        contentType: file.type,
        fileName: file.name,
        size: file.size,
      }),
    });
  } catch {
    throw new Error("تعذر الاتصال بخادم الرفع.");
  }

  const payload = (await response.json().catch(() => null)) as PresignResponse | null;
  if (!response.ok || !payload?.uploadUrl || !payload.url) {
    throw new Error(payload?.error || `فشل رفع الصورة (${response.status || "شبكة"}).`);
  }

  return {
    uploadUrl: payload.uploadUrl,
    url: payload.url,
    headers: payload.headers,
  };
}

function putWithProgress(
  uploadUrl: string,
  file: File,
  headers: Record<string, string> | undefined,
  onProgress: (value: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

    for (const [name, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }

      reject(new Error(`فشل رفع الصورة (${xhr.status || "شبكة"}).`));
    };

    xhr.onerror = () => {
      reject(new Error("تعذر الاتصال بخادم الرفع."));
    };

    xhr.ontimeout = () => {
      reject(new Error("انتهت مهلة رفع الصورة."));
    };

    xhr.timeout = 120_000;
    xhr.send(file);
  });
}

async function uploadWithProgress(
  file: File,
  purpose: string,
  onProgress: (value: number) => void,
): Promise<{ url: string }> {
  const presign = await requestPresign(file, purpose);
  await putWithProgress(presign.uploadUrl, file, presign.headers, onProgress);
  return { url: presign.url };
}

export function UploadField({
  endpoint,
  inputName,
  label,
  defaultValue,
  helpText,
  buttonLabel,
  onUploaded,
  includeHiddenInput = true,
}: UploadFieldProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileUrl, setFileUrl] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    defaultValue ? "done" : "idle",
  );
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setStatus("uploading");
    setProgress(0);
    setErrorMessage(null);

    try {
      const prepared = await prepareImageForUpload(file, endpoint);
      const result = await uploadWithProgress(prepared, endpoint, setProgress);
      setFileUrl(result.url);
      setStatus("done");
      setProgress(100);
      onUploaded?.(result.url);
    } catch (error) {
      setStatus("error");
      setProgress(0);
      setErrorMessage(
        error instanceof Error ? error.message : "فشل رفع الملف.",
      );
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor={inputId}>
        {label}
      </label>
      {includeHiddenInput && inputName ? (
        <input type="hidden" name={inputName} value={fileUrl} />
      ) : null}

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
        {fileUrl ? (
          <div className="mb-3 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={label}
              className="max-h-40 w-full object-contain"
            />
          </div>
        ) : null}

        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
          disabled={status === "uploading"}
        />

        <button
          type="button"
          disabled={status === "uploading"}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {status === "uploading"
            ? progress > 0
              ? `جارٍ الرفع... ${progress}%`
              : "جارٍ الرفع..."
            : fileUrl
              ? "استبدال الصورة"
              : buttonLabel || "اختيار ورفع الملف"}
        </button>

        <p className="mt-2 text-xs text-zinc-500">
          صورة فقط · تُضغط تلقائيًا (حافة ≤ {IMAGE_MAX_LONG_EDGE}px) قبل الرفع
        </p>

        {status === "uploading" ? (
          <div className="mt-3 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
                style={{ width: `${Math.max(progress, 8)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-600">
              جارٍ رفع الصورة{progress > 0 ? ` (${progress}%)` : ""}...
            </p>
          </div>
        ) : null}

        {status === "done" && fileUrl ? (
          <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            تم رفع الصورة بنجاح وسيتم حفظها مع النموذج.
          </p>
        ) : null}

        {status === "error" && errorMessage ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            فشل الرفع: {errorMessage}
          </p>
        ) : null}

        {helpText ? (
          <p className="mt-3 text-xs leading-6 text-zinc-500">{helpText}</p>
        ) : null}
      </div>
    </div>
  );
}
