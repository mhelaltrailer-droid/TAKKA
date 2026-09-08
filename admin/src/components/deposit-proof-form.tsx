"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { UploadButton } from "@/lib/uploadthing";

type DepositProofFormProps = {
  orderId: string;
};

export function DepositProofForm({ orderId }: DepositProofFormProps) {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");
  const [submittedAmount, setSubmittedAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitProof() {
    setLoading(true);
    setError(null);

    try {
      if (!imageUrl) {
        throw new Error("ارفع صورة إثبات العربون أولًا.");
      }

      const response = await fetch(`/api/orders/${orderId}/deposit-proof`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          submittedAmount: submittedAmount ? Number(submittedAmount) : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إرسال إثبات العربون.");
      }

      setImageUrl("");
      setSubmittedAmount("");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر إرسال إثبات العربون.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">إرسال إثبات العربون</h2>
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
        <UploadButton
          endpoint="depositProofImage"
          appearance={{
            button:
              "ut-ready:bg-[var(--brand-primary)] ut-uploading:bg-zinc-400 ut-ready:text-white ut-label:text-sm ut-allowed-content:text-xs",
            container: "w-full items-start",
          }}
          content={{
            button({ ready }) {
              return ready ? "رفع صورة التحويل" : "جاري التحضير...";
            },
          }}
          onClientUploadComplete={(res) => {
            const uploaded = res?.[0];

            if (uploaded?.ufsUrl) {
              setImageUrl(uploaded.ufsUrl);
            }
          }}
          onUploadError={(uploadError: Error) => {
            window.alert(`فشل رفع الصورة: ${uploadError.message}`);
          }}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">المبلغ المحول</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={submittedAmount}
          onChange={(event) => setSubmittedAmount(event.target.value)}
          className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
      </div>

      {imageUrl ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          تم رفع صورة الإثبات وهي جاهزة للإرسال مع الطلب.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submitProof}
        disabled={loading}
        className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "جارٍ الإرسال..." : "إرسال إثبات العربون"}
      </button>
    </div>
  );
}
