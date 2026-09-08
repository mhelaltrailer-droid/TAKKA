"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ConfirmReceiptButtonProps = {
  orderId: string;
};

export function ConfirmReceiptButton({
  orderId,
}: ConfirmReceiptButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmReceipt() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/confirm-received`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر تأكيد الاستلام.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر تأكيد الاستلام.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">تأكيد الاستلام</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-600">
        إذا وصلك الطلب بالفعل، أكد الاستلام لإغلاق الطلب وفتح التقييم.
      </p>
      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={confirmReceipt}
        disabled={loading}
        className="mt-5 w-full rounded-full bg-emerald-600 px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "جارٍ التأكيد..." : "تأكيد استلام الطلب"}
      </button>
    </div>
  );
}
