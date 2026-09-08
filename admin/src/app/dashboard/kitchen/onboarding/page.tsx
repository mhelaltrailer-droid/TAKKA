import Link from "next/link";

import { SubmitButton } from "@/components/submit-button";
import { StatusPill } from "@/components/status-pill";
import { UploadField } from "@/components/upload-field";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";

import { saveKitchenOnboarding } from "./actions";

export default async function KitchenOnboardingPage() {
  const user = await requireAuth();

  const kitchen = await db.kitchen.findUnique({
    where: {
      ownerUserId: user.appUserId,
    },
    include: {
      paymentMethods: true,
      documents: true,
      region: true,
    },
  });

  const paymentMethod = kitchen?.paymentMethods[0];
  const nationalIdDocument = kitchen?.documents.find(
    (document) => document.documentType === "national_id",
  );

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Kitchen Onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold">إعداد حساب المطبخ</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            هذه أول نسخة عملية من رحلة تسجيل المطبخ. يتم هنا حفظ بيانات
            المطبخ، بيانات `InstaPay`، ومستند البطاقة الشخصية، ثم يوضع الحساب في
            انتظار اعتماد الإدارة.
          </p>
          {kitchen ? (
            <div className="mt-4">
              <StatusPill
                label={getApprovalStatusLabel(kitchen.approvalStatus)}
                tone={
                  kitchen.approvalStatus === "APPROVED"
                    ? "success"
                    : kitchen.approvalStatus === "PENDING"
                      ? "warning"
                      : "danger"
                }
              />
            </div>
          ) : null}
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
            >
              العودة إلى لوحة التحكم
            </Link>
          </div>
        </header>

        <form
          action={saveKitchenOnboarding}
          className="grid gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <section className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="kitchenName" className="block text-sm font-medium">
                اسم المطبخ
              </label>
              <input
                id="kitchenName"
                name="kitchenName"
                defaultValue={kitchen?.kitchenName ?? ""}
                required
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="phoneNumber" className="block text-sm font-medium">
                رقم الهاتف
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                defaultValue={kitchen?.phoneNumber ?? ""}
                required
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
              />
            </div>
          </section>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              وصف المطبخ
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={kitchen?.description ?? ""}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
            />
          </div>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="cityName" className="block text-sm font-medium">
                المدينة
              </label>
              <input
                id="cityName"
                name="cityName"
                defaultValue={kitchen?.cityName ?? ""}
                required
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="regionName" className="block text-sm font-medium">
                الحي / المنطقة
              </label>
              <input
                id="regionName"
                name="regionName"
                defaultValue={kitchen?.region.regionName ?? ""}
                required
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
              />
            </div>
          </section>

          <div className="space-y-2">
            <label htmlFor="addressLine" className="block text-sm font-medium">
              العنوان التفصيلي
            </label>
            <input
              id="addressLine"
              name="addressLine"
              defaultValue={kitchen?.addressLine ?? ""}
              required
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
            />
          </div>

          <section className="grid gap-6 md:grid-cols-2">
            <UploadField
              endpoint="kitchenLogo"
              inputName="logoUrl"
              label="لوجو المطبخ"
              defaultValue={kitchen?.logoUrl}
              helpText="ارفع لوجو واضح للمطبخ. يفضل أن يكون مربعًا وخفيف الحجم."
            />

            <UploadField
              endpoint="kitchenCover"
              inputName="coverImageUrl"
              label="صورة الغلاف"
              defaultValue={kitchen?.coverImageUrl}
              helpText="استخدم صورة تعبر عن المطبخ أو المنتجات الرئيسية."
            />
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="instapayHandle" className="block text-sm font-medium">
                رقم الحساب أو Handle على InstaPay
              </label>
              <input
                id="instapayHandle"
                name="instapayHandle"
                defaultValue={paymentMethod?.accountNumberOrHandle ?? ""}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="instapayLink" className="block text-sm font-medium">
                رابط InstaPay
              </label>
              <input
                id="instapayLink"
                name="instapayLink"
                defaultValue={paymentMethod?.paymentLink ?? ""}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-0"
              />
            </div>
          </section>

          <UploadField
            endpoint="kitchenDocument"
            inputName="nationalIdImageUrl"
            label="صورة البطاقة الشخصية"
            defaultValue={nationalIdDocument?.fileUrl}
            helpText="هذه الصورة تستخدم فقط لأغراض الاعتماد الإداري ولا تظهر للعملاء."
          />

          <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-4">
            <div className="text-sm text-zinc-600">
              {kitchen ? "سيتم تحديث بيانات المطبخ الحالية." : "سيتم إنشاء مطبخ جديد وربطه بحسابك."}
            </div>
            <SubmitButton label="حفظ وإرسال للاعتماد" />
          </div>
        </form>
      </div>
    </main>
  );
}
