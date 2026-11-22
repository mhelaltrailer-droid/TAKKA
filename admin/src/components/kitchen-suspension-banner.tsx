"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type KitchenSuspensionBannerProps = {
  reason: string;
  canAcknowledge: boolean;
};

export function KitchenSuspensionBanner({
  reason,
  canAcknowledge,
}: KitchenSuspensionBannerProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function acknowledge() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/kitchen/suspension/acknowledge", {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        requiresAdmin?: boolean;
      };
      if (!response.ok) {
        throw new Error(body.error || "تعذر تأكيد قراءة التنبيه.");
      }
      if (body.requiresAdmin) {
        throw new Error("الإيقاف ده محتاج إعادة تفعيل من إدارة تكة.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تأكيد قراءة التنبيه.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4">
      <p className="text-sm font-semibold text-amber-950">
        استقبال الطلبات متوقف
      </p>
      <p className="mt-2 text-sm leading-7 text-amber-950">{reason}</p>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        {canAcknowledge
          ? "العملاء يشوفون المطبخ مشغول ولا يستطيعون الطلب لحد ما تضغط «فهمت»."
          : "العملاء يشوفون المطبخ مشغول. قراءة التنبيه لا تفك هذا الإيقاف، وفريق تكة فقط يقدر يعيد التفعيل."}
      </p>
      {canAcknowledge ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => void acknowledge()}
          className="mt-3 bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "جاري التأكيد..." : "فهمت"}
        </button>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-medium text-[#b42318]">{error}</p>
      ) : null}
    </div>
  );
}
