"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CancelOrderButtonProps = {
  orderId: string;
  /** true when status is DEPOSIT_PROOF_SUBMITTED */
  hadDepositProofSubmitted: boolean;
};

export function CancelOrderButton({
  orderId,
  hadDepositProofSubmitted,
}: CancelOrderButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancelOrder() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر إلغاء الطلب.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "تعذر إلغاء الطلب.",
      );
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">إلغاء الطلب</h2>
        <p className="mt-3 text-sm leading-7 text-zinc-600">
          يمكنك الإلغاء فقط قبل تأكيد المطبخ للعربون.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={loading}
          className="mt-5 w-full rounded-full border border-red-200 px-5 py-3 font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
        >
          إلغاء الطلب
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-red-900">تأكيد الإلغاء</h2>
      <p className="mt-3 text-sm leading-7 text-red-900/80">
        هل أنت متأكد من إلغاء هذا الطلب؟
      </p>
      {hadDepositProofSubmitted ? (
        <p className="mt-2 text-sm leading-7 text-red-900/80">
          لو حوّلت العربون بالفعل، تواصل مع المطبخ بخصوص المبلغ — الاسترداد يتم
          يدويًا خارج التطبيق.
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl bg-white px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={cancelOrder}
          disabled={loading}
          className="w-full rounded-full bg-red-600 px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "جارٍ الإلغاء..." : "نعم، ألغِ الطلب"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          disabled={loading}
          className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-70"
        >
          رجوع
        </button>
      </div>
    </div>
  );
}
