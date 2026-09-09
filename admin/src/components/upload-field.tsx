"use client";

import { useState } from "react";

import { UploadButton } from "@/lib/uploadthing";

type UploadFieldProps = {
  endpoint:
    | "kitchenLogo"
    | "kitchenCover"
    | "kitchenDocument"
    | "menuItemImage"
    | "depositProofImage"
    | "chatImage"
    | "promoBannerImage";
  inputName: string;
  label: string;
  defaultValue?: string | null;
  helpText?: string;
};

function resolveUploadedUrl(file: {
  ufsUrl?: string | null;
  url?: string | null;
  appUrl?: string | null;
}) {
  return file.ufsUrl || file.url || file.appUrl || "";
}

export function UploadField({
  endpoint,
  inputName,
  label,
  defaultValue,
  helpText,
}: UploadFieldProps) {
  const [fileUrl, setFileUrl] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    defaultValue ? "done" : "idle",
  );
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>
      <input type="hidden" name={inputName} value={fileUrl} />

      <div
        className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4"
        onClick={(event) => event.stopPropagation()}
      >
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

        <UploadButton
          endpoint={endpoint}
          appearance={{
            button:
              "ut-ready:bg-[var(--brand-primary)] ut-uploading:cursor-not-allowed ut-uploading:bg-zinc-400 ut-ready:text-white ut-label:text-sm ut-allowed-content:text-xs after:bg-[var(--brand-primary)]",
            container: "w-full items-start",
            allowedContent: "text-xs text-zinc-500",
          }}
          content={{
            button({ ready, isUploading }) {
              if (isUploading) {
                return progress > 0
                  ? `جارٍ الرفع... ${progress}%`
                  : "جارٍ الرفع...";
              }
              if (!ready) {
                return "جاري التحضير...";
              }
              return fileUrl ? "استبدال الصورة" : "اختيار ورفع الملف";
            },
            allowedContent({ ready, isUploading }) {
              if (isUploading) {
                return "لا تغلق الصفحة حتى يكتمل الرفع";
              }
              if (!ready) {
                return "انتظر لحظة...";
              }
              return "صورة فقط · بحد أقصى الحجم المسموح";
            },
          }}
          onUploadBegin={() => {
            setStatus("uploading");
            setProgress(0);
            setErrorMessage(null);
          }}
          onUploadProgress={(value) => {
            setProgress(Math.round(value));
            setStatus("uploading");
          }}
          onClientUploadComplete={(res) => {
            const uploaded = res?.[0];
            const url = uploaded ? resolveUploadedUrl(uploaded) : "";

            if (!url) {
              setStatus("error");
              setErrorMessage("اكتمل الرفع لكن لم يُرجع رابط الصورة.");
              return;
            }

            setFileUrl(url);
            setStatus("done");
            setProgress(100);
            setErrorMessage(null);
          }}
          onUploadError={(error: Error) => {
            setStatus("error");
            setProgress(0);
            setErrorMessage(error.message || "فشل رفع الملف.");
          }}
        />

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
