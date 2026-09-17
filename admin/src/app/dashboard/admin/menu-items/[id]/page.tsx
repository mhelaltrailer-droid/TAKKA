import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFoodCategoryById } from "@/lib/food-categories";
import { parsePendingSizes } from "@/lib/moderation";
import {
  ORDER_READINESS_FIELD_LABEL,
  getOrderReadinessLabel,
} from "@/lib/order-readiness";
import { getApprovalStatusLabel } from "@/lib/status-labels";

import { approveMenuItem, rejectMenuItem } from "../../actions";

export default async function AdminMenuItemReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["admin"]);
  const { id } = await params;

  const item = await db.menuItem.findUnique({
    where: { id },
    include: {
      sizes: { orderBy: { createdAt: "asc" } },
      kitchen: {
        select: {
          id: true,
          kitchenName: true,
          approvalStatus: true,
        },
      },
    },
  });

  if (!item) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border bg-white p-6">
          <h1 className="text-2xl font-bold">الصنف غير موجود</h1>
          <Link href="/dashboard/admin/menu-items" className="mt-4 inline-block text-sm underline">
            العودة
          </Link>
        </div>
      </main>
    );
  }

  const isDraft = item.draftStatus === "PENDING";
  const canReview =
    item.approvalStatus === "PENDING" || item.draftStatus === "PENDING";
  const reviewName = isDraft ? item.pendingName || item.name : item.name;
  const reviewDescription = isDraft
    ? item.pendingDescription
    : item.description;
  const reviewImage = isDraft ? item.pendingImageUrl : item.imageUrl;
  const reviewCategoryId = isDraft
    ? item.pendingCategoryId || item.categoryId
    : item.categoryId;
  const reviewPrice = isDraft
    ? item.pendingBasePrice ?? item.basePrice
    : item.basePrice;
  const reviewDiscounted = isDraft
    ? item.pendingDiscountedPrice
    : item.discountedPrice;
  const reviewDeposit = isDraft
    ? item.pendingDepositAmount ?? item.depositAmount
    : item.depositAmount;
  const pendingSizes = parsePendingSizes(item.pendingSizesJson);
  const category = getFoodCategoryById(reviewCategoryId);

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{reviewName}</h1>
            <StatusPill
              label={isDraft ? "تعديل معلّق" : getApprovalStatusLabel(item.approvalStatus)}
              tone="warning"
            />
          </div>
          <p className="mt-3 text-sm text-zinc-600">
            المطبخ: {item.kitchen.kitchenName}
          </p>
          <Link
            href="/dashboard/admin/menu-items"
            className="mt-4 inline-flex text-sm font-medium text-[var(--brand-secondary)] underline"
          >
            العودة لقائمة الأصناف
          </Link>
        </header>

        {isDraft ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
            هذا طلب تعديل على صنف معتمد. النسخة الحالية تبقى ظاهرة للعملاء حتى
            تعتمد التعديل.
          </section>
        ) : null}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-5">
            <h2 className="font-semibold">
              {isDraft ? "النسخة المقترحة" : "بيانات الصنف"}
            </h2>
            {reviewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={reviewImage}
                alt={reviewName}
                className="mt-4 max-h-56 w-full rounded-2xl object-cover"
              />
            ) : null}
            <div className="mt-4 space-y-2 text-sm leading-7 text-zinc-700">
              <p>الفئة: {category?.label || reviewCategoryId}</p>
              <p>السعر الأساسي: {Number(reviewPrice).toFixed(2)} ج.م</p>
              <p>
                السعر بعد الخصم:{" "}
                {reviewDiscounted != null
                  ? `${Number(reviewDiscounted).toFixed(2)} ج.م`
                  : "—"}
              </p>
              <p>العربون: {Number(reviewDeposit).toFixed(2)} ج.م</p>
              <p>
                {ORDER_READINESS_FIELD_LABEL}:{" "}
                {getOrderReadinessLabel(item.orderReadiness)}
              </p>
              <p>الوصف: {reviewDescription || "—"}</p>
            </div>
            {(isDraft ? pendingSizes : item.sizes.map((s) => ({
              sizeName: s.sizeName,
              price: s.price.toString(),
              depositAmount: s.depositAmount?.toString() ?? null,
            }))).length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                {(isDraft
                  ? pendingSizes
                  : item.sizes.map((s) => ({
                      sizeName: s.sizeName,
                      price: s.price.toString(),
                      depositAmount: s.depositAmount?.toString() ?? null,
                    }))
                ).map((size, index) => (
                  <li key={index}>
                    {size.sizeName}: {Number(size.price).toFixed(2)} ج.م
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {isDraft ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-5">
              <h2 className="font-semibold">النسخة الحالية (للعملاء)</h2>
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="mt-4 max-h-56 w-full rounded-2xl object-cover"
                />
              ) : null}
              <div className="mt-4 space-y-2 text-sm leading-7 text-zinc-700">
                <p>الاسم: {item.name}</p>
                <p>الفئة: {getFoodCategoryById(item.categoryId)?.label}</p>
                <p>السعر الأساسي: {Number(item.basePrice).toFixed(2)} ج.م</p>
                <p>
                  السعر بعد الخصم:{" "}
                  {item.discountedPrice != null
                    ? `${Number(item.discountedPrice).toFixed(2)} ج.م`
                    : "—"}
                </p>
                <p>العربون: {Number(item.depositAmount).toFixed(2)} ج.م</p>
                <p>
                  {ORDER_READINESS_FIELD_LABEL}:{" "}
                  {getOrderReadinessLabel(item.orderReadiness)}
                </p>
                <p>الوصف: {item.description || "—"}</p>
              </div>
            </div>
          ) : null}
        </section>

        {canReview ? (
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">قرار الاعتماد</h2>
            <div className="mt-5 flex flex-col gap-4 md:flex-row">
              <form action={approveMenuItem}>
                <input type="hidden" name="menuItemId" value={item.id} />
                <button
                  type="submit"
                  className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  اعتماد
                </button>
              </form>
              <form action={rejectMenuItem} className="flex flex-1 flex-col gap-3">
                <input type="hidden" name="menuItemId" value={item.id} />
                <label className="text-sm font-medium" htmlFor="rejectionReason">
                  سبب الرفض (إلزامي)
                </label>
                <textarea
                  id="rejectionReason"
                  name="rejectionReason"
                  required
                  rows={3}
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm"
                  placeholder="سيظهر السبب لصاحب المطبخ داخل التطبيق"
                />
                <button
                  type="submit"
                  className="self-start rounded-full border border-red-200 px-5 py-3 text-sm font-semibold text-red-600"
                >
                  رفض مع إرسال السبب
                </button>
              </form>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
