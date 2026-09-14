"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ObourLocationFields } from "@/components/obour-location-fields";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { UploadField } from "@/components/upload-field";
import {
  KITCHEN_COORDS_REQUIRED,
  KITCHEN_LOCATION_HINT,
  KITCHEN_ONBOARDING_DRAFT_KEY,
  KITCHEN_ONBOARDING_STEPS,
  KITCHEN_UPLOAD_CRITERIA,
} from "@/lib/kitchen-onboarding-copy";
import { isValidLatLng } from "@/lib/maps";
import { OBOUR_CITY_NAME } from "@/lib/obour-areas";
import { getApprovalStatusLabel } from "@/lib/status-labels";

import { saveKitchenOnboarding } from "@/app/dashboard/kitchen/onboarding/actions";

export type KitchenOnboardingInitial = {
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  rejectionReason: string | null;
  kitchenName: string;
  description: string;
  phoneNumber: string;
  regionName: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string;
  coverImageUrl: string;
  instapayHandle: string;
  instapayLink: string;
  nationalIdImageUrl: string;
};

type DraftState = {
  step: number;
  kitchenName: string;
  description: string;
  phoneNumber: string;
  regionName: string;
  addressLine: string;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string;
  coverImageUrl: string;
  instapayHandle: string;
  instapayLink: string;
  nationalIdImageUrl: string;
};

function emptyDraft(): DraftState {
  return {
    step: 1,
    kitchenName: "",
    description: "",
    phoneNumber: "",
    regionName: "",
    addressLine: "",
    latitude: null,
    longitude: null,
    logoUrl: "",
    coverImageUrl: "",
    instapayHandle: "",
    instapayLink: "",
    nationalIdImageUrl: "",
  };
}

function fromInitial(initial: KitchenOnboardingInitial): DraftState {
  return {
    step: 1,
    kitchenName: initial.kitchenName,
    description: initial.description,
    phoneNumber: initial.phoneNumber,
    regionName: initial.regionName,
    addressLine: initial.addressLine,
    latitude: initial.latitude,
    longitude: initial.longitude,
    logoUrl: initial.logoUrl,
    coverImageUrl: initial.coverImageUrl,
    instapayHandle: initial.instapayHandle,
    instapayLink: initial.instapayLink,
    nationalIdImageUrl: initial.nationalIdImageUrl,
  };
}

export function KitchenOnboardingWizard({
  initial,
}: {
  initial: KitchenOnboardingInitial;
}) {
  const [editing, setEditing] = useState(!initial.approvalStatus);
  const [draft, setDraft] = useState<DraftState>(() => fromInitial(initial));
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (initial.approvalStatus && initial.approvalStatus !== "REJECTED") {
      return;
    }
    try {
      const raw = window.localStorage.getItem(KITCHEN_ONBOARDING_DRAFT_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as DraftState;
      setDraft((current) => ({
        ...current,
        ...parsed,
        step: Math.min(4, Math.max(1, Number(parsed.step) || 1)),
      }));
    } catch {
      // ignore corrupt draft
    }
  }, [initial.approvalStatus]);

  const status = initial.approvalStatus;
  const showWizard =
    editing || !status || (status === "REJECTED" && editing);

  function persistDraft(next: DraftState) {
    window.localStorage.setItem(
      KITCHEN_ONBOARDING_DRAFT_KEY,
      JSON.stringify(next),
    );
  }

  function updateDraft(patch: Partial<DraftState>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      persistDraft(next);
      return next;
    });
  }

  function saveDraftOnly() {
    persistDraft(draft);
    setDraftNotice("تم حفظ المسودة على هذا الجهاز.");
    window.setTimeout(() => setDraftNotice(null), 2500);
  }

  function validateStep(step: number) {
    if (step === 1) {
      if (!draft.kitchenName.trim() || !draft.phoneNumber.trim()) {
        return "أدخل اسم المطبخ ورقم الهاتف.";
      }
      if (!draft.regionName.trim() || !draft.addressLine.trim()) {
        return "اختر الحي وأدخل العنوان التفصيلي.";
      }
      if (!isValidLatLng(draft.latitude, draft.longitude)) {
        return KITCHEN_COORDS_REQUIRED;
      }
    }
    return null;
  }

  function goNext() {
    const error = validateStep(draft.step);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    updateDraft({ step: Math.min(4, draft.step + 1) });
  }

  function goPrev() {
    setStepError(null);
    updateDraft({ step: Math.max(1, draft.step - 1) });
  }

  const progressLabel = useMemo(
    () => `الخطوة ${draft.step} من ${KITCHEN_ONBOARDING_STEPS.length}`,
    [draft.step],
  );

  if (status === "PENDING" && !editing) {
    return (
      <StatusOnlyCard
        tone="warning"
        title="قيد المراجعة"
        body="تم استلام بيانات مطبخك وهي قيد مراجعة الإدارة. بعد الاعتماد تقدر تضيف الأصناف وتستقبل الطلبات."
        actionHref="/dashboard"
        actionLabel="العودة إلى لوحة التحكم"
      />
    );
  }

  if (status === "APPROVED" && !editing) {
    return (
      <StatusOnlyCard
        tone="success"
        title="المطبخ معتمد"
        body="حساب مطبخك معتمد. يمكنك إدارة المنيو والطلبات من لوحة التحكم."
        actionHref="/dashboard/menu"
        actionLabel="إدارة المنيو"
      />
    );
  }

  if (status === "REJECTED" && !editing) {
    return (
      <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm">
        <StatusPill label={getApprovalStatusLabel("REJECTED")} tone="danger" />
        <h2 className="mt-4 text-2xl font-bold">تم رفض اعتماد المطبخ</h2>
        <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-7 text-red-800">
          <p className="font-semibold">سبب الرفض</p>
          <p className="mt-1">{initial.rejectionReason || "لم يُذكر سبب تفصيلي."}</p>
        </div>
        <p className="mt-4 text-sm leading-7 text-zinc-600">
          عدّل البيانات حسب السبب ثم أعد الإرسال للمراجعة مرة أخرى.
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-5 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white"
        >
          عدّل وأعد الإرسال
        </button>
      </section>
    );
  }

  if (!showWizard) {
    return null;
  }

  return (
    <form
      action={async (formData) => {
        window.localStorage.removeItem(KITCHEN_ONBOARDING_DRAFT_KEY);
        await saveKitchenOnboarding(formData);
      }}
      className="space-y-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {KITCHEN_ONBOARDING_STEPS[draft.step - 1]?.title}
          </h2>
          <span className="text-sm text-zinc-500">{progressLabel}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-all"
            style={{ width: `${(draft.step / 4) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {KITCHEN_ONBOARDING_STEPS.map((step) => (
            <span
              key={step.id}
              className={`rounded-full px-3 py-1 text-xs ${
                step.id === draft.step
                  ? "bg-[var(--brand-primary)] text-white"
                  : step.id < draft.step
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-zinc-100 text-zinc-600"
              }`}
            >
              {step.id}. {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Always submit full draft values */}
      <input type="hidden" name="kitchenName" value={draft.kitchenName} />
      <input type="hidden" name="description" value={draft.description} />
      <input type="hidden" name="phoneNumber" value={draft.phoneNumber} />
      <input type="hidden" name="cityName" value={OBOUR_CITY_NAME} />
      <input type="hidden" name="regionName" value={draft.regionName} />
      <input type="hidden" name="addressLine" value={draft.addressLine} />
      <input
        type="hidden"
        name="latitude"
        value={draft.latitude ?? ""}
      />
      <input
        type="hidden"
        name="longitude"
        value={draft.longitude ?? ""}
      />
      <input type="hidden" name="logoUrl" value={draft.logoUrl} />
      <input type="hidden" name="coverImageUrl" value={draft.coverImageUrl} />
      <input type="hidden" name="instapayHandle" value={draft.instapayHandle} />
      <input type="hidden" name="instapayLink" value={draft.instapayLink} />
      <input
        type="hidden"
        name="nationalIdImageUrl"
        value={draft.nationalIdImageUrl}
      />

      {draft.step === 1 ? (
        <div className="space-y-5">
          <Field
            label="اسم المطبخ"
            value={draft.kitchenName}
            onChange={(value) => updateDraft({ kitchenName: value })}
          />
          <Field
            label="رقم الهاتف"
            value={draft.phoneNumber}
            onChange={(value) => updateDraft({ phoneNumber: value })}
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium">وصف المطبخ</label>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) =>
                updateDraft({ description: event.target.value })
              }
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
            />
          </div>
          <ObourLocationFields
            defaultRegionName={draft.regionName}
            defaultLatitude={draft.latitude}
            defaultLongitude={draft.longitude}
            regionName={draft.regionName}
            onRegionChange={(regionName) => updateDraft({ regionName })}
            onCoordsChange={(coords) =>
              updateDraft({
                latitude: coords?.latitude ?? null,
                longitude: coords?.longitude ?? null,
              })
            }
            submitFields={false}
            coordsRequired
          />
          <p className="text-sm leading-6 text-zinc-500">
            {KITCHEN_LOCATION_HINT}
          </p>
          <Field
            label="العنوان التفصيلي"
            value={draft.addressLine}
            onChange={(value) => updateDraft({ addressLine: value })}
          />
        </div>
      ) : null}

      {draft.step === 2 ? (
        <div className="grid gap-6 md:grid-cols-2">
          <UploadField
            endpoint="kitchenLogo"
            label="لوجو المطبخ"
            defaultValue={draft.logoUrl || null}
            includeHiddenInput={false}
            helpText={KITCHEN_UPLOAD_CRITERIA.logo}
            onUploaded={(url) => updateDraft({ logoUrl: url })}
          />
          <UploadField
            endpoint="kitchenCover"
            label="صورة الغلاف"
            defaultValue={draft.coverImageUrl || null}
            includeHiddenInput={false}
            helpText={KITCHEN_UPLOAD_CRITERIA.cover}
            onUploaded={(url) => updateDraft({ coverImageUrl: url })}
          />
        </div>
      ) : null}

      {draft.step === 3 ? (
        <div className="space-y-5">
          <Field
            label="رقم الحساب أو المعرّف على إنستاباي"
            value={draft.instapayHandle}
            onChange={(value) => updateDraft({ instapayHandle: value })}
          />
          <Field
            label="رابط إنستاباي"
            value={draft.instapayLink}
            onChange={(value) => updateDraft({ instapayLink: value })}
          />
          <UploadField
            endpoint="kitchenDocument"
            label="صورة البطاقة الشخصية"
            defaultValue={draft.nationalIdImageUrl || null}
            includeHiddenInput={false}
            helpText={KITCHEN_UPLOAD_CRITERIA.nationalId}
            onUploaded={(url) => updateDraft({ nationalIdImageUrl: url })}
          />
        </div>
      ) : null}

      {draft.step === 4 ? (
        <div className="space-y-3 rounded-2xl bg-zinc-50 px-4 py-4 text-sm leading-7 text-zinc-700">
          <p>
            <span className="font-semibold">اسم المطبخ:</span>{" "}
            {draft.kitchenName || "—"}
          </p>
          <p>
            <span className="font-semibold">الهاتف:</span>{" "}
            {draft.phoneNumber || "—"}
          </p>
          <p>
            <span className="font-semibold">الحي:</span>{" "}
            {draft.regionName || "—"}
          </p>
          <p>
            <span className="font-semibold">العنوان:</span>{" "}
            {draft.addressLine || "—"}
          </p>
          <p>
            <span className="font-semibold">اللوجو:</span>{" "}
            {draft.logoUrl ? "تم الرفع" : "غير مرفوع"}
          </p>
          <p>
            <span className="font-semibold">الغلاف:</span>{" "}
            {draft.coverImageUrl ? "تم الرفع" : "غير مرفوع"}
          </p>
          <p>
            <span className="font-semibold">إنستاباي:</span>{" "}
            {draft.instapayHandle || draft.instapayLink || "—"}
          </p>
          <p>
            <span className="font-semibold">البطاقة:</span>{" "}
            {draft.nationalIdImageUrl ? "تم الرفع" : "غير مرفوع"}
          </p>
          <p className="text-xs text-zinc-500">
            بالضغط على إرسال سيتم وضع المطبخ في حالة «قيد المراجعة».
          </p>
        </div>
      ) : null}

      {stepError ? (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {stepError}
        </p>
      ) : null}
      {draftNotice ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {draftNotice}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
        <button
          type="button"
          onClick={saveDraftOnly}
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
        >
          حفظ المسودة
        </button>
        <div className="flex flex-wrap gap-2">
          {draft.step > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              السابق
            </button>
          ) : null}
          {draft.step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-full bg-[var(--brand-primary)] px-5 py-2 text-sm font-semibold text-white"
            >
              التالي
            </button>
          ) : (
            <SubmitButton
              label={
                status === "REJECTED"
                  ? "إرسال بعد التعديل"
                  : "حفظ وإرسال للاعتماد"
              }
              pendingLabel="جارٍ الإرسال..."
            />
          )}
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
      />
    </div>
  );
}

function StatusOnlyCard({
  tone,
  title,
  body,
  actionHref,
  actionLabel,
}: {
  tone: "success" | "warning";
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <StatusPill
        label={title}
        tone={tone === "success" ? "success" : "warning"}
      />
      <h2 className="mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-zinc-600">{body}</p>
      <Link
        href={actionHref}
        className="mt-5 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
