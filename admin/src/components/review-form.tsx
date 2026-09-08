"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReviewFormProps = {
  orderId: string;
};

export function ReviewForm({ orderId }: ReviewFormProps) {
  const router = useRouter();
  const [ratingValue, setRatingValue] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ratingValue,
          comment,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "تعذر حفظ التقييم.");
      }

      setComment("");
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "تعذر حفظ التقييم.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">قيّم المطبخ</h2>
      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">عدد النجوم</label>
          <select
            value={ratingValue}
            onChange={(event) => setRatingValue(Number(event.target.value))}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          >
            <option value={5}>5 نجوم</option>
            <option value={4}>4 نجوم</option>
            <option value={3}>3 نجوم</option>
            <option value={2}>2 نجوم</option>
            <option value={1}>1 نجمة</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">تعليقك</label>
          <textarea
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            placeholder="اكتب رأيك في التجربة..."
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submitReview}
          disabled={loading}
          className="w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "جارٍ إرسال التقييم..." : "إرسال التقييم"}
        </button>
      </div>
    </div>
  );
}
