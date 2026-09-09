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

export function UploadField({
  endpoint,
  inputName,
  label,
  defaultValue,
  helpText,
}: UploadFieldProps) {
  const [fileUrl, setFileUrl] = useState(defaultValue ?? "");

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>
      <input type="hidden" name={inputName} value={fileUrl} />
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <UploadButton
          endpoint={endpoint}
          appearance={{
            button:
              "ut-ready:bg-[var(--brand-primary)] ut-uploading:bg-zinc-400 ut-ready:text-white ut-label:text-sm ut-allowed-content:text-xs",
            container: "w-full items-start",
          }}
          content={{
            button({ ready }) {
              return ready ? "اختيار ورفع الملف" : "جاري التحضير...";
            },
          }}
          onClientUploadComplete={(res) => {
            const uploaded = res?.[0];

            if (uploaded?.ufsUrl) {
              setFileUrl(uploaded.ufsUrl);
            }
          }}
          onUploadError={(error: Error) => {
            window.alert(`فشل رفع الملف: ${error.message}`);
          }}
        />
        {helpText ? (
          <p className="mt-3 text-xs leading-6 text-zinc-500">{helpText}</p>
        ) : null}
      </div>
      {fileUrl ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          تم حفظ رابط الملف بنجاح وسيتم إرساله مع النموذج.
        </p>
      ) : null}
    </div>
  );
}
