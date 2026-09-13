import Link from "next/link";

import { KitchenOnboardingWizard } from "@/components/kitchen-onboarding-wizard";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";

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
            شركاء تكة
          </p>
          <h1 className="mt-2 text-3xl font-bold">إعداد حساب المطبخ</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            أكمل بيانات مطبخك على خطوات واضحة: البيانات والحي، الصور، الدفع
            والهوية، ثم المراجعة والإرسال لاعتماد الإدارة.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
            >
              العودة إلى لوحة التحكم
            </Link>
          </div>
        </header>

        <KitchenOnboardingWizard
          initial={{
            approvalStatus: kitchen?.approvalStatus ?? null,
            rejectionReason: kitchen?.rejectionReason ?? null,
            kitchenName: kitchen?.kitchenName ?? "",
            description: kitchen?.description ?? "",
            phoneNumber: kitchen?.phoneNumber ?? "",
            regionName: kitchen?.region.regionName ?? "",
            addressLine: kitchen?.addressLine ?? "",
            latitude: kitchen?.latitude ?? null,
            longitude: kitchen?.longitude ?? null,
            logoUrl: kitchen?.logoUrl ?? "",
            coverImageUrl: kitchen?.coverImageUrl ?? "",
            instapayHandle: paymentMethod?.accountNumberOrHandle ?? "",
            instapayLink: paymentMethod?.paymentLink ?? "",
            nationalIdImageUrl: nationalIdDocument?.fileUrl ?? "",
          }}
        />
      </div>
    </main>
  );
}
