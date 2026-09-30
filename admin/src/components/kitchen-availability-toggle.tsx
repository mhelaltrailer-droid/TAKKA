"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { confirmDestructive } from "@/lib/confirm-destructive";

type KitchenAvailabilityToggleProps = {
  initialStatus: "OPEN" | "CLOSED";
  approvalStatus: string;
};

export function KitchenAvailabilityToggle({
  initialStatus,
  approvalStatus,
}: KitchenAvailabilityToggleProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"OPEN" | "CLOSED">(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isApproved = approvalStatus === "APPROVED";
  const isOpen = status === "OPEN";

  async function setAvailability(next: "OPEN" | "CLOSED") {
    if (!isApproved || isPending || next === status) {
      return;
    }

    if (next === "CLOSED") {
      const confirmed = confirmDestructive(
        "عند الإغلاق لن يظهر مطبخك للعملاء ولن يستقبل طلبات جديدة. هل تريد الإغلاق؟",
      );
      if (!confirmed) {
        return;
      }
    }

    setError(null);

    try {
      const response = await fetch("/api/kitchen/availability", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ availabilityStatus: next }),
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        availabilityStatus?: "OPEN" | "CLOSED";
      };

      if (!response.ok) {
        throw new Error(body.error || "تعذر تحديث حالة المطبخ.");
      }

      const resolved = body.availabilityStatus ?? next;
      setStatus(resolved);
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر تحديث حالة المطبخ.",
      );
    }
  }

  if (!isApproved) {
    return (
      <div className="mt-4 rounded-2xl border border-[#ead9c8] bg-[#fff8f1] px-4 py-4">
        <p className="text-sm font-semibold text-[#4a2e22]">
          فتح المطبخ للعملاء
        </p>
        <p className="mt-1 text-sm leading-6 text-[#6b4a3a]">
          بعد موافقة الإدارة يمكنك فتح استقبال الطلبات ليظهر مطبخك في «تاكل
          ايه؟» واستعراض المطابخ.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#ead9c8] bg-[#fff8f1] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#4a2e22]">
            {isOpen ? "المطبخ مفتوح للعملاء" : "المطبخ مغلق"}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#6b4a3a]">
            {isOpen
              ? "يظهر مطبخك للعملاء ويمكنهم إرسال طلبات."
              : "لن يظهر مطبخك للعملاء حتى تفتح استقبال الطلبات."}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => void setAvailability(isOpen ? "CLOSED" : "OPEN")}
          className={
            isOpen
              ? "inline-flex min-w-[10rem] justify-center border border-[#c4a484] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a2e22] transition hover:border-[var(--brand-primary)] disabled:opacity-60"
              : "inline-flex min-w-[10rem] justify-center bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
          }
        >
          {isPending
            ? "جاري التحديث..."
            : isOpen
              ? "إغلاق الاستقبال"
              : "فتح استقبال الطلبات"}
        </button>
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-[#b42318]">{error}</p>
      ) : null}
    </div>
  );
}
