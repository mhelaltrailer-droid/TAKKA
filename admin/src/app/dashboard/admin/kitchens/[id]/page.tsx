import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";

import { approveKitchen, rejectKitchen } from "../../actions";

export default async function AdminKitchenReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;

  const kitchen = await db.kitchen.findUnique({
    where: { id },
    include: {
      region: true,
      paymentMethods: true,
      documents: true,
      owner: {
        select: {
          fullName: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  if (!kitchen) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-6">
          <h1 className="text-2xl font-bold">المطبخ غير موجود</h1>
          <Link href="/dashboard/admin/kitchens" className="mt-4 inline-block text-sm underline">
            العودة للقائمة
          </Link>
        </div>
      </main>
    );
  }

  const payment = kitchen.paymentMethods[0];
  const nationalId = kitchen.documents.find((d) => d.documentType === "national_id");

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{kitchen.kitchenName}</h1>
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
          <p className="mt-3 text-sm text-zinc-600">
            مراجعة كاملة لبيانات المطبخ قبل الاعتماد أو الرفض.
          </p>
          <Link
            href="/dashboard/admin/kitchens"
            className="mt-4 inline-flex text-sm font-medium text-[var(--brand-secondary)] underline"
          >
            العودة لقائمة المطابخ
          </Link>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {kitchen.logoUrl ? (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={kitchen.logoUrl} alt="لوجو المطبخ" className="h-56 w-full object-contain bg-zinc-50" />
              <p className="px-4 py-3 text-sm font-medium">اللوجو</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
              لا يوجد لوجو مرفوع.
            </div>
          )}
          {kitchen.coverImageUrl ? (
            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={kitchen.coverImageUrl} alt="غلاف المطبخ" className="h-56 w-full object-cover" />
              <p className="px-4 py-3 text-sm font-medium">صورة الغلاف</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
              لا توجد صورة غلاف.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">البيانات</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-zinc-700 md:grid-cols-2">
            <p>المالك: {kitchen.owner.fullName}</p>
            <p>البريد: {kitchen.owner.email || "—"}</p>
            <p>هاتف الحساب: {kitchen.owner.phoneNumber || "—"}</p>
            <p>هاتف المطبخ: {kitchen.phoneNumber}</p>
            <p>
              المنطقة: {kitchen.region.cityName} - {kitchen.region.regionName}
            </p>
            <p>العنوان: {kitchen.addressLine}</p>
            <p>
              الموقع:{" "}
              {kitchen.latitude != null && kitchen.longitude != null
                ? `${kitchen.latitude}, ${kitchen.longitude}`
                : "غير محدد"}
            </p>
            <p>
              InstaPay:{" "}
              {payment?.accountNumberOrHandle || payment?.paymentLink || "غير مضاف"}
            </p>
          </div>
          <p className="mt-4 text-sm leading-7 text-zinc-700">
            الوصف: {kitchen.description || "لا يوجد وصف."}
          </p>
          {kitchen.rejectionReason ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              آخر سبب رفض: {kitchen.rejectionReason}
            </p>
          ) : null}
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">المستندات</h2>
          {nationalId?.fileUrl ? (
            <div className="mt-4 space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={nationalId.fileUrl}
                alt="البطاقة الشخصية"
                className="max-h-80 rounded-2xl border object-contain"
              />
              <a
                href={nationalId.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-medium text-[var(--brand-secondary)] underline"
              >
                فتح الصورة في تبويب جديد
              </a>
            </div>
          ) : (
            <p className="mt-3 text-sm text-red-600">لا توجد صورة بطاقة مرفوعة.</p>
          )}
        </section>

        {kitchen.approvalStatus === "PENDING" ? (
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">قرار الاعتماد</h2>
            <div className="mt-5 flex flex-col gap-4 md:flex-row">
              <form action={approveKitchen}>
                <input type="hidden" name="kitchenId" value={kitchen.id} />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  اعتماد المطبخ
                </button>
              </form>
              <form action={rejectKitchen} className="flex flex-1 flex-col gap-3">
                <input type="hidden" name="kitchenId" value={kitchen.id} />
                <label className="text-sm font-medium" htmlFor="rejectionReason">
                  سبب الرفض (إلزامي)
                </label>
                <textarea
                  id="rejectionReason"
                  name="rejectionReason"
                  required
                  rows={3}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm"
                  placeholder="اكتب سبب الرفض ليظهر لصاحب المطبخ في التطبيق"
                />
                <button
                  type="submit"
                  className="self-start rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600"
                >
                  رفض المطبخ وإرسال السبب
                </button>
              </form>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
