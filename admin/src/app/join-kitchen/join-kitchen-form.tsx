"use client";

import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";

import { KITCHEN_JOIN_SEGMENTS } from "@/lib/kitchen-join-leads";
import { phoneValidationMessage } from "@/lib/phone";

type Props = {
  districts: string[];
};

const OTHER_DISTRICT_VALUE = "__other__";

export function JoinKitchenForm({ districts }: Props) {
  const searchParams = useSearchParams();
  const source = useMemo(
    () => searchParams.get("src")?.trim() || "",
    [searchParams],
  );

  const [fullName, setFullName] = useState("");
  const [district, setDistrict] = useState("");
  const [otherDistrict, setOtherDistrict] = useState("");
  const [segment, setSegment] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const isOtherDistrict = district === OTHER_DISTRICT_VALUE;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const phoneError = phoneValidationMessage(whatsapp);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("الاسم مطلوب (حرفين على الأقل).");
      return;
    }
    if (!district) {
      setError("اختاري الحي.");
      return;
    }
    const resolvedDistrict = isOtherDistrict
      ? otherDistrict.trim()
      : district;
    if (isOtherDistrict && (!resolvedDistrict || resolvedDistrict.length < 2)) {
      setError("اكتبي اسم الحي.");
      return;
    }
    if (!segment) {
      setError("اختاري نوع الانضمام.");
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/join-kitchen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            district: isOtherDistrict
              ? `حي آخر — ${resolvedDistrict}`
              : resolvedDistrict,
            segment,
            whatsapp: whatsapp.trim(),
            source: source || undefined,
          }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          setError(body.error ?? "تعذر تسجيل الاهتمام. جرّبي مرة أخرى.");
          return;
        }
        setDone(true);
      } catch {
        setError("تعذر الاتصال. تأكدي من الإنترنت وحاولي مرة أخرى.");
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <p className="flex justify-center">
          <img
            src="/takka-logo.png"
            alt="تكّة"
            className="h-20 w-20 rounded-full object-cover shadow-sm"
          />
        </p>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-primary)]/15 text-2xl text-[var(--brand-primary)]">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-[#3b2418]">
          تم تسجيل بياناتكِ بنجاح
        </h1>
        <p className="text-base leading-8 text-[#6b4a3a]">
          فريق تكّة هيتواصل معاكي على واتساب خلال 24 ساعة
          <br />
          غالبًا بين <strong>4 و 10 مساءً</strong>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <header className="space-y-3 text-center">
        <p className="flex justify-center">
          <img
            src="/takka-logo.png"
            alt="تكّة"
            className="h-24 w-24 rounded-full object-cover shadow-sm"
          />
        </p>
        <h1 className="text-xl font-bold text-[#3b2418] md:text-2xl">
          انضمي كمقدمة أكل بيتي
        </h1>
        <p className="text-sm leading-7 text-[#6b4a3a]">
          هنساعد في التسجيل و فتح مطبخ علي التطبيق بشكل احترافي عشان تحقق اعلي
          ارباح 💰
        </p>
      </header>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#3b2418]">الاسم</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3 text-[#3b2418] outline-none focus:border-[var(--brand-primary)]"
          autoComplete="name"
          required
        />
      </label>

      <div className="space-y-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#3b2418]">الحي</span>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3 text-[#3b2418] outline-none focus:border-[var(--brand-primary)]"
            required
          >
            <option value="">اختاري الحي</option>
            {districts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER_DISTRICT_VALUE}>حي اخر</option>
          </select>
        </label>
        {isOtherDistrict ? (
          <input
            value={otherDistrict}
            onChange={(e) => setOtherDistrict(e.target.value)}
            placeholder="اكتبي اسم الحي"
            className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3 text-[#3b2418] outline-none focus:border-[var(--brand-primary)]"
            required
          />
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#3b2418]">النوع</legend>
        <div className="grid gap-2">
          {KITCHEN_JOIN_SEGMENTS.map((item) => {
            const selected = segment === item.value;
            return (
              <label
                key={item.value}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  selected
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[#3b2418]"
                    : "border-[#ead9c8] bg-white text-[#3b2418] hover:bg-[#fff4ea]"
                }`}
              >
                <input
                  type="radio"
                  name="segment"
                  value={item.value}
                  checked={selected}
                  onChange={() => setSegment(item.value)}
                  className="accent-[var(--brand-primary)]"
                />
                {item.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#3b2418]">
          رقم واتساب
        </span>
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          inputMode="numeric"
          placeholder="01xxxxxxxxx"
          className="w-full rounded-2xl border border-[#ead9c8] bg-white px-4 py-3 text-[#3b2418] outline-none focus:border-[var(--brand-primary)]"
          autoComplete="tel"
          required
        />
      </label>

      {error ? (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-[var(--brand-primary)] px-4 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--brand-secondary)] disabled:opacity-60"
      >
        {pending ? "جاري التسجيل…" : "سجّلي اهتمامكِ"}
      </button>

      <p className="text-center text-xs leading-6 text-[#6b4a3a]">
        بالتسجيل، توافقين على تواصل فريق تكّة معاكِ عبر واتساب/الهاتف بخصوص
        الانضمام كمقدّمة أكل. بياناتكِ للانضمام فقط.
      </p>
    </form>
  );
}
