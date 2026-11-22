import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatCoords,
  googleMapsShareUrl,
  isValidLatLng,
} from "@/lib/maps";
import {
  getApprovalStatusLabel,
  getAvailabilityStatusLabel,
} from "@/lib/status-labels";
import { customerFacingAvailability } from "@/lib/kitchen-order-rules";

import { setReviewVisibility } from "../../orders/actions";
import { approveKitchen, rejectKitchen } from "../../actions";
import { reactivateKitchen } from "../../kitchen-policy/actions";

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
      reviews: {
        orderBy: { createdAt: "desc" },
        include: {
          customer: { select: { fullName: true } },
          order: { select: { orderNumber: true } },
        },
      },
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
  const hasCoords = isValidLatLng(kitchen.latitude, kitchen.longitude);
  const mapsUrl = hasCoords
    ? googleMapsShareUrl(Number(kitchen.latitude), Number(kitchen.longitude))
    : null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{kitchen.kitchenName}</h1>
            <StatusPill
              label={getAvailabilityStatusLabel(kitchen.availabilityStatus)}
              tone={
                kitchen.availabilityStatus === "OPEN"
                  ? "success"
                  : kitchen.availabilityStatus === "BUSY"
                    ? "warning"
                    : "neutral"
              }
            />
            {kitchen.suspendedAt ? (
              <StatusPill
                label={
                  kitchen.suspensionLevel === "LEVEL_2"
                    ? "موقوف مستوى 2"
                    : "موقوف مستوى 1"
                }
                tone="danger"
              />
            ) : null}
            <StatusPill
              label={`ظاهر للعميل: ${getAvailabilityStatusLabel(
                customerFacingAvailability(
                  kitchen.availabilityStatus,
                  kitchen.suspendedAt != null,
                ),
              )}`}
              tone="info"
            />
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
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href="/dashboard/admin/kitchens"
              className="inline-flex text-sm font-medium text-[var(--brand-secondary)] underline"
            >
              العودة لقائمة المطابخ
            </Link>
            <Link
              href={`/dashboard/admin/kitchens/${kitchen.id}/audit`}
              className="inline-flex text-sm font-medium text-[var(--brand-secondary)] underline"
            >
              سجل الأداء والإيقاف
            </Link>
          </div>
          {kitchen.suspendedAt ? (
            <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-950">
              <p>{kitchen.suspensionReason || "المطبخ موقوف عن استقبال الطلبات."}</p>
              <form action={reactivateKitchen} className="mt-3">
                <input type="hidden" name="kitchenId" value={kitchen.id} />
                <button
                  type="submit"
                  className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  إعادة التفعيل
                </button>
              </form>
            </div>
          ) : null}
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
            <div className="space-y-2 md:col-span-2">
              <p>
                الموقع:{" "}
                {hasCoords
                  ? formatCoords(
                      Number(kitchen.latitude),
                      Number(kitchen.longitude),
                    )
                  : "غير محدد"}
              </p>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-secondary)]"
                >
                  عرض الموقع على Google Maps
                </a>
              ) : (
                <p className="text-xs text-amber-700">
                  لا توجد إحداثيات صالحة لفتح الخريطة.
                </p>
              )}
            </div>
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

        <section
          id="reviews"
          className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-xl font-semibold">تقييمات العملاء</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            صاحب المطبخ مش بيقدر يعدل أو يمسح التقييم. تقدر تخفيه من صفحة
            المطبخ ومن متوسط التقييم.
          </p>
          <div className="mt-5 space-y-3">
            {kitchen.reviews.length === 0 ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                لا توجد تقييمات.
              </p>
            ) : (
              kitchen.reviews.map((review) => (
                <article
                  key={review.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-zinc-200 p-4"
                >
                  <div>
                    <p className="font-medium">
                      {review.customer.fullName || "عميل"} · {review.ratingValue}/5
                      {review.visibility === "HIDDEN" ? " · مخفي" : ""}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      طلب {review.order.orderNumber}
                    </p>
                    {review.comment ? (
                      <p className="mt-2 text-sm leading-7 text-zinc-700">
                        {review.comment}
                      </p>
                    ) : null}
                  </div>
                  <form action={setReviewVisibility}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input
                      type="hidden"
                      name="visibility"
                      value={review.visibility === "HIDDEN" ? "VISIBLE" : "HIDDEN"}
                    />
                    <button
                      type="submit"
                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold"
                    >
                      {review.visibility === "HIDDEN"
                        ? "إظهار التقييم"
                        : "إخفاء التقييم"}
                    </button>
                  </form>
                </article>
              ))
            )}
          </div>
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
