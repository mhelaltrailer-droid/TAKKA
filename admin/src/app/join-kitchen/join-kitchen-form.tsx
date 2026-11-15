"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  JOIN_KITCHEN_COPY,
  KITCHEN_JOIN_SEGMENTS,
  joinKitchenPhoneError,
} from "@/lib/kitchen-join-leads";
import { normalizeEgyptianPhone } from "@/lib/phone";

type Props = {
  districts: string[];
  source: string;
};

const OTHER_DISTRICT_VALUE = "__other__";

const fieldClassName =
  "w-full rounded-2xl border border-[#5C3016]/15 bg-white px-4 py-3 text-[#5C3016] outline-none focus:border-[#E8742A]";

export function JoinKitchenForm({ districts, source }: Props) {
  const [fullName, setFullName] = useState("");
  const [district, setDistrict] = useState("");
  const [otherDistrict, setOtherDistrict] = useState("");
  const [segment, setSegment] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const isOtherDistrict = district === OTHER_DISTRICT_VALUE;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const companyWebsite = String(
      new FormData(event.currentTarget).get("ak_hp") ?? "",
    );

    const phoneError = joinKitchenPhoneError(whatsapp);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError(JOIN_KITCHEN_COPY.nameRequired);
      return;
    }
    if (fullName.trim().length > 80) {
      setError(JOIN_KITCHEN_COPY.nameTooLong);
      return;
    }
    if (!district) {
      setError(JOIN_KITCHEN_COPY.districtRequired);
      return;
    }
    const resolvedDistrict = isOtherDistrict ? otherDistrict.trim() : district;
    if (isOtherDistrict && resolvedDistrict.length < 2) {
      setError(JOIN_KITCHEN_COPY.otherDistrictRequired);
      return;
    }
    if (!segment) {
      setError(JOIN_KITCHEN_COPY.segmentRequired);
      return;
    }

    const submittedDistrict = isOtherDistrict
      ? `حي آخر — ${resolvedDistrict}`
      : resolvedDistrict;
    if (submittedDistrict.length > 80) {
      setError(JOIN_KITCHEN_COPY.districtTooLong);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/join-kitchen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: fullName.trim(),
            district: submittedDistrict,
            segment,
            whatsapp: normalizeEgyptianPhone(whatsapp),
            source: source || undefined,
            companyWebsite,
          }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (!response.ok) {
          setError(body.error ?? JOIN_KITCHEN_COPY.generic);
          return;
        }
        setDone(true);
      } catch {
        setError(JOIN_KITCHEN_COPY.network);
      }
    });
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <p className="flex justify-center">
          <img
            src="/takka-logo.png"
            alt="تكة"
            className="h-20 w-20 rounded-full object-cover shadow-sm"
          />
        </p>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#E8742A]/15 text-2xl text-[#E8742A]">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-[#5C3016]">
          تم تسجيل بياناتك بنجاح
        </h1>
        <p className="text-base leading-8 text-[#5C3016]/80">
          فريق تكة هيتواصل معاكي على واتساب خلال 24 ساعة
          <br />
          غالبًا بين <strong className="text-[#5C3016]">4 و 10 مساءً</strong>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5">
      <div className="sr-only" aria-hidden="true">
        <label>
          لا تملئي هذا الحقل
          <input tabIndex={-1} autoComplete="off" name="ak_hp" defaultValue="" />
        </label>
      </div>

      <header className="space-y-3 text-center">
        <p className="flex justify-center">
          <img
            src="/takka-logo.png"
            alt="تكة"
            className="h-24 w-24 rounded-full object-cover shadow-sm"
          />
        </p>
        <p className="text-sm font-bold text-[#5C3016]">
          <span className="text-[#E8742A]">الأكل البيتي</span> كله على تكة
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[#5C3016] md:text-3xl">
          أكلك حلو؟ مكانك معانا
        </h1>
        <p className="text-sm leading-7 text-[#5C3016]/80">
          هنساعدك تفتحي مطبخك على التطبيق وتبدأي تبيعي أكل بيتك.
        </p>
      </header>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#5C3016]">الاسم</span>
        <input
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          className={fieldClassName}
          autoComplete="name"
          required
        />
      </label>

      <div className="space-y-2">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[#5C3016]">الحي</span>
          <select
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className={fieldClassName}
            required
          >
            <option value="">اختاري الحي</option>
            {districts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={OTHER_DISTRICT_VALUE}>حي آخر</option>
          </select>
        </label>
        {isOtherDistrict ? (
          <input
            value={otherDistrict}
            onChange={(event) => setOtherDistrict(event.target.value)}
            placeholder="اكتبي اسم الحي"
            className={fieldClassName}
            required
          />
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-[#5C3016]">النوع</legend>
        <div className="grid gap-2">
          {KITCHEN_JOIN_SEGMENTS.map((item) => {
            const selected = segment === item.value;
            return (
              <label
                key={item.value}
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  selected
                    ? "border-[#E8742A] bg-[#E8742A]/10 text-[#5C3016]"
                    : "border-[#5C3016]/15 bg-white text-[#5C3016] hover:bg-[#FEFAEE]"
                }`}
              >
                <input
                  type="radio"
                  name="segment"
                  value={item.value}
                  checked={selected}
                  onChange={() => setSegment(item.value)}
                  className="accent-[#E8742A]"
                />
                {item.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[#5C3016]">رقم واتساب</span>
        <input
          value={whatsapp}
          onChange={(event) => setWhatsapp(event.target.value)}
          onBlur={() => {
            const next = normalizeEgyptianPhone(whatsapp);
            if (next) setWhatsapp(next);
          }}
          dir="ltr"
          inputMode="tel"
          placeholder="01xxxxxxxxx"
          className={`${fieldClassName} text-left`}
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
        className="w-full rounded-2xl bg-[#E8742A] px-4 py-3.5 text-base font-semibold text-white transition hover:bg-[#c45d1c] disabled:opacity-60"
      >
        {pending ? "جاري التسجيل…" : "مكانك معانا"}
      </button>

      <p className="text-center text-xs leading-6 text-[#5C3016]/75">
        بالتسجيل، بتوافقي إن فريق تكة يتواصل معاكي على واتساب أو التليفون بخصوص
        الانضمام. بياناتك للانضمام بس، ومش هتتباع ولا هتستخدم في إعلانات بره
        تكة.
      </p>
    </form>
  );
}
