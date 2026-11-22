"use client";

import { useState, useTransition } from "react";

import type { KitchenOrderPolicyValues } from "@/lib/kitchen-order-rules";

import { updateKitchenOrderPolicy } from "./actions";

const FIELDS: Array<{
  name: keyof Omit<
    KitchenOrderPolicyValues,
    | "customerNoResponseMessage"
    | "level1SuspensionMessage"
    | "level2SuspensionMessage"
  >;
  label: string;
  hint: string;
}> = [
  {
    name: "acceptanceTimeoutMinutes",
    label: "مهلة قبول الطلب (دقائق)",
    hint: "لو المطبخ ما قبلش أو رفض خلال المهلة دي، الطلب يتلغي تلقائيًا.",
  },
  {
    name: "shortWindowCount",
    label: "عدد عدم الرد في النافذة القصيرة",
    hint: "يتوقف المطبخ لما يوصل للعدد ده من إلغاءات عدم الرد.",
  },
  {
    name: "shortWindowHours",
    label: "طول النافذة القصيرة (ساعات)",
    hint: "نافذة متحركة بالساعات، مش يوم تقويمي ثابت.",
  },
  {
    name: "longWindowCount",
    label: "عدد عدم الرد في النافذة الطويلة",
    hint: "حد تاني مستقل. لو النافذتين اتحققوا مع بعض، المستوى 2 هو اللي يتطبق.",
  },
  {
    name: "longWindowDays",
    label: "طول النافذة الطويلة (أيام)",
    hint: "نافذة متحركة بالأيام. 90 يوم تقريبًا 3 شهور.",
  },
];

export function KitchenPolicyForm({
  initial,
}: {
  initial: KitchenOrderPolicyValues;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaved(false);
    startTransition(async () => {
      const result = await updateKitchenOrderPolicy(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setSaved(true);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      {FIELDS.map((field) => (
        <label key={field.name} className="block">
          <span className="text-sm font-semibold text-[#3b2418]">
            {field.label}
          </span>
          <input
            name={field.name}
            type="number"
            min={1}
            required
            defaultValue={initial[field.name]}
            className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
          />
          <span className="mt-1 block text-xs leading-6 text-zinc-500">
            {field.hint}
          </span>
        </label>
      ))}
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          رسالة العميل عند إلغاء عدم الرد
        </span>
        <textarea
          name="customerNoResponseMessage"
          required
          rows={3}
          defaultValue={initial.customerNoResponseMessage}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
        <span className="mt-1 block text-xs leading-6 text-zinc-500">
          بتظهر في إشعار العميل وعلى صفحة الطلب. الرفض اليدوي من المطبخ له
          رسالة مختلفة ومش بيحسب في الإيقاف.
        </span>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          رسالة إيقاف المستوى 1 (يفكها المطبخ بـ «فهمت»)
        </span>
        <textarea
          name="level1SuspensionMessage"
          required
          rows={4}
          defaultValue={initial.level1SuspensionMessage}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3b2418]">
          رسالة إيقاف المستوى 2 (إعادة التفعيل من الإدارة فقط)
        </span>
        <textarea
          name="level2SuspensionMessage"
          required
          rows={4}
          defaultValue={initial.level2SuspensionMessage}
          className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
        />
        <span className="mt-1 block text-xs leading-6 text-zinc-500">
          النص محفوظ كما هو. لو غيّرت الأعداد أو المدد، عدّل الرسائل عشان تفضل
          متوافقة معاها.
        </span>
      </label>
      {error ? (
        <p className="text-sm font-medium text-[#b42318]">{error}</p>
      ) : null}
      {saved ? (
        <p className="text-sm font-medium text-emerald-700">تم حفظ الإعدادات.</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "جاري الحفظ..." : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
