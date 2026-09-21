"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReviewFormProps = {
  orderId: string;
  kitchenName: string;
};

export function ReviewForm({ orderId, kitchenName }: ReviewFormProps) {
  const router = useRouter();
  const [ratingValue, setRatingValue] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview() {
    if (ratingValue < 1 || ratingValue > 5) {
      setError("اختر عدد النجوم أولاً.");
      return;
    }

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
          comment: comment.trim() || undefined,
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
    <div className="rounded-3xl border-2 border-[#e67e22]/40 bg-[#fff8f1] p-6 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-[#e67e22]">
        تقييم التجربة
      </p>
      <h2 className="mt-2 text-xl font-bold text-[#3b2418]">
        كيف كانت تجربتك مع مطبخ {kitchenName}؟
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#6b4a3a]">
        اختر النجوم، والتعليق اختياري.
      </p>

      <div className="mt-5 flex items-center justify-center gap-2" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = star <= ratingValue;
          return (
            <button
              key={star}
              type="button"
              aria-label={`${star} نجوم`}
              onClick={() => setRatingValue(star)}
              className={`text-4xl leading-none transition ${
                selected ? "text-[#e67e22]" : "text-[#ead9c8]"
              }`}
            >
              ★
            </button>
          );
        })}
      </div>
      {ratingValue > 0 ? (
        <p className="mt-2 text-center text-sm font-medium text-[#3b2418]">
          {ratingValue} / 5
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        <label className="block text-sm font-medium text-[#3b2418]">
          تعليق (اختياري)
        </label>
        <textarea
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3 text-sm outline-none"
          placeholder="اكتب رأيك في الأكل أو الخدمة..."
        />
      </div>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submitReview}
        disabled={loading || ratingValue < 1}
        className="mt-5 w-full rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "جارٍ الإرسال..." : "إرسال"}
      </button>
    </div>
  );
}

type ReviewThanksProps = {
  kitchenName: string;
  ratingValue: number;
  comment?: string | null;
};

export function ReviewThanksCard({
  kitchenName,
  ratingValue,
  comment,
}: ReviewThanksProps) {
  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <h2 className="text-xl font-bold text-emerald-900">شكرًا، تم التقييم</h2>
      <p className="mt-2 text-sm leading-6 text-emerald-800">
        تم تسجيل تقييمك لمطبخ {kitchenName}. لن يطلب منك التقييم مرة أخرى لهذا
        الطلب.
      </p>
      <div className="mt-4 flex items-center gap-1 text-2xl text-[#e67e22]" dir="ltr">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={index < ratingValue ? "text-[#e67e22]" : "text-[#cfe8d5]"}
          >
            ★
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm font-medium text-emerald-900">
        {ratingValue} / 5
      </p>
      {comment?.trim() ? (
        <p className="mt-3 text-sm leading-6 text-emerald-900">{comment}</p>
      ) : null}
    </div>
  );
}
