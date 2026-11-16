"use client";

import { useState } from "react";

import { ORDER_ISSUE_OPTIONS } from "@/lib/order-issues";
import {
  buildOrderSupportMessage,
  supportWhatsappUrl,
} from "@/lib/support-whatsapp";

type OrderSupportButtonProps = {
  orderId: string;
  orderNumber: string;
  kitchenName: string;
  supportWhatsappNumber: string;
};

export function OrderSupportButton({
  orderId,
  orderNumber,
  kitchenName,
  supportWhatsappNumber,
}: OrderSupportButtonProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof ORDER_ISSUE_OPTIONS)[number]["type"]>(
    ORDER_ISSUE_OPTIONS[0].type,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setFallbackUrl(null);
    const option = ORDER_ISSUE_OPTIONS.find((item) => item.type === type);
    const problemLabel = option?.label ?? "حاجة تانية";
    const popup = window.open("", "_blank", "noopener,noreferrer");
    try {
      const response = await fetch(`/api/orders/${orderId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          note: note.trim() || undefined,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || "تعذر تسجيل المشكلة.");
      }

      const url = supportWhatsappUrl(
        supportWhatsappNumber,
        buildOrderSupportMessage({
          orderNumber,
          kitchenName,
          problemLabel,
          note,
        }),
      );
      if (popup) {
        popup.location.href = url;
        setOpen(false);
      } else {
        setFallbackUrl(url);
      }
    } catch (caught) {
      popup?.close();
      setError(
        caught instanceof Error ? caught.message : "تعذر تسجيل المشكلة.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
          setFallbackUrl(null);
        }}
        className="flex w-full items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-[#3b2418]"
      >
        محتاج مساعدة؟ / عندي مشكلة في الطلب
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-[#3b2418]">
              عندي مشكلة في الطلب
            </h3>
            <p className="mt-2 text-sm leading-7 text-[#6b4a3a]">
              اختار نوع المشكلة. هنتسجلها عند تكة ونفتح واتساب برسالة فيها رقم
              الطلب واسم المطبخ.
            </p>
            <div className="mt-4 space-y-2">
              {ORDER_ISSUE_OPTIONS.map((option) => (
                <label
                  key={option.type}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#ead9c8] px-3 py-3 text-sm font-semibold"
                >
                  <input
                    type="radio"
                    name="issue-type"
                    checked={type === option.type}
                    onChange={() => setType(option.type)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium text-[#3b2418]">
              تفاصيل (اختياري)
              <textarea
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#ead9c8] px-3 py-2 text-sm outline-none"
                placeholder="اكتب اللي حصل باختصار..."
              />
            </label>
            {error ? (
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </p>
            ) : null}
            {fallbackUrl ? (
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-sm font-bold text-[var(--brand-secondary)] underline"
              >
                افتح واتساب
              </a>
            ) : null}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="rounded-full bg-[var(--brand-primary)] px-4 py-3 text-sm font-bold text-white disabled:opacity-70"
              >
                {busy ? "جارٍ التسجيل..." : "افتح واتساب"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-zinc-300 px-4 py-3 text-sm font-semibold"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
