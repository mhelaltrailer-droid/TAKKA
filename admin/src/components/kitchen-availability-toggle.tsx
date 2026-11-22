"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { confirmDestructive } from "@/lib/confirm-destructive";

type AvailabilityCode = "OPEN" | "BUSY" | "CLOSED";

type KitchenAvailabilityToggleProps = {
  initialStatus: AvailabilityCode;
  approvalStatus: string;
};

const OPTIONS: Array<{
  status: AvailabilityCode;
  label: string;
  title: string;
  body: string;
}> = [
  {
    status: "OPEN",
    label: "مفتوح",
    title: "المطبخ مفتوح للعملاء",
    body: "يظهر مطبخك للعملاء ويمكنهم إرسال طلبات. الحالة تفضل مفتوح لحد ما تغيّرها بنفسك.",
  },
  {
    status: "BUSY",
    label: "مشغول",
    title: "المطبخ مشغول",
    body: "يظهر مطبخك للعملاء كـ «مشغول» ولا يستقبل طلبات جديدة. الحالة تفضل مشغول لحد ما تغيّرها بنفسك.",
  },
  {
    status: "CLOSED",
    label: "مغلق",
    title: "المطبخ مغلق",
    body: "لن يظهر مطبخك في استعراض المطابخ ولن يستقبل طلبات جديدة.",
  },
];

export function KitchenAvailabilityToggle({
  initialStatus,
  approvalStatus,
}: KitchenAvailabilityToggleProps) {
  const router = useRouter();
  const [status, setStatus] = useState<AvailabilityCode>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isApproved = approvalStatus === "APPROVED";
  const current = OPTIONS.find((option) => option.status === status) ?? OPTIONS[2];

  async function setAvailability(next: AvailabilityCode) {
    if (!isApproved || isPending || next === status) {
      return;
    }

    if (next === "BUSY") {
      const confirmed = confirmDestructive(
        "العملاء هيشوفوا المطبخ مشغول ومش هيقدروا يطلبوا لحد ما تغيّر الحالة بنفسك. هل تريد المتابعة؟",
      );
      if (!confirmed) {
        return;
      }
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
        availabilityStatus?: AvailabilityCode;
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
      setError(err instanceof Error ? err.message : "تعذر تحديث حالة المطبخ.");
    }
  }

  if (!isApproved) {
    return (
      <div className="mt-4 rounded-2xl border border-[#ead9c8] bg-[#fff8f1] px-4 py-4">
        <p className="text-sm font-semibold text-[#4a2e22]">فتح المطبخ للعملاء</p>
        <p className="mt-1 text-sm leading-6 text-[#6b4a3a]">
          بعد موافقة الإدارة يمكنك فتح استقبال الطلبات ليظهر مطبخك في «تاكل
          ايه؟» واستعراض المطابخ.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-[#ead9c8] bg-[#fff8f1] px-4 py-4">
      <p className="text-sm font-semibold text-[#4a2e22]">{current.title}</p>
      <p className="mt-1 text-sm leading-6 text-[#6b4a3a]">{current.body}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => {
          const selected = option.status === status;
          return (
            <button
              key={option.status}
              type="button"
              disabled={isPending}
              onClick={() => void setAvailability(option.status)}
              className={
                selected
                  ? "bg-[var(--brand-primary)] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  : "border border-[#c4a484] bg-white px-3 py-2.5 text-sm font-semibold text-[#4a2e22] disabled:opacity-60"
              }
            >
              {isPending && selected ? "..." : option.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-3 text-sm font-medium text-[#b42318]">{error}</p>
      ) : null}
    </div>
  );
}
