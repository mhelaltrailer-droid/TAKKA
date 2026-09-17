import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { UploadField } from "@/components/upload-field";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FOOD_CATEGORIES, getFoodCategoryById } from "@/lib/food-categories";
import {
  ORDER_READINESS_FIELD_LABEL,
  ORDER_READINESS_OPTIONS,
  getOrderReadinessLabel,
} from "@/lib/order-readiness";
import { getApprovalStatusLabel } from "@/lib/status-labels";

import {
  createMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "./actions";
import { KitchenDealsPanel } from "./kitchen-deals-panel";

export default async function MenuManagementPage() {
  const user = await requireAuth();

  const kitchen = await db.kitchen.findUnique({
    where: {
      ownerUserId: user.appUserId,
    },
    select: {
      id: true,
      kitchenName: true,
      approvalStatus: true,
      rejectionReason: true,
      menuItems: {
        include: {
          sizes: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!kitchen) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">لا يوجد مطبخ مرتبط بحسابك بعد</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            أكمل إعداد المطبخ أولًا حتى نستطيع ربط الأصناف بالمطبخ الصحيح.
          </p>
          <Link
            href="/dashboard/kitchen/onboarding"
            className="mt-5 inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white"
          >
            الذهاب إلى إعداد المطبخ
          </Link>
        </div>
      </main>
    );
  }

  if (kitchen.approvalStatus !== "APPROVED") {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-amber-950">
            انتظر اعتماد المطبخ أولًا
          </h1>
          <p className="mt-3 text-sm leading-7 text-amber-900">
            لا يمكن إضافة الأصناف قبل اعتماد المطبخ من الإدارة. تابع حالة
            الاعتماد من شاشة إعداد المطبخ.
          </p>
          {kitchen.approvalStatus === "REJECTED" && kitchen.rejectionReason ? (
            <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-7 text-red-700">
              سبب الرفض: {kitchen.rejectionReason}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/dashboard/kitchen/onboarding"
              className="inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white"
            >
              {kitchen.approvalStatus === "REJECTED"
                ? "عدّل وأعد الإرسال"
                : "متابعة حالة الاعتماد"}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex rounded-full border border-amber-300 bg-white px-5 py-3 font-medium text-amber-950"
            >
              العودة إلى لوحة التحكم
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            منيو المطبخ
          </p>
          <h1 className="mt-2 text-3xl font-bold">إدارة المنيو</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            أضف الأصناف، حدّد السعر والعربون والصورة والأحجام، وأرسلها للاعتماد
            قبل ظهورها للعملاء.
          </p>
          <div className="mt-4 space-y-3">
            <StatusPill
              label={getApprovalStatusLabel(kitchen.approvalStatus)}
              tone="success"
            />
          </div>
        </header>

        <KitchenDealsPanel
          menuItems={kitchen.menuItems.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            categoryId: item.categoryId,
            basePrice: Number(item.basePrice),
            discountedPrice: item.discountedPrice
              ? Number(item.discountedPrice)
              : null,
            depositAmount: Number(item.depositAmount),
            imageUrl: item.imageUrl,
            approvalStatus: item.approvalStatus,
            isAvailable: item.isAvailable,
            draftStatus: item.draftStatus,
          }))}
        />

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <form
            action={createMenuItem}
            className="grid gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">إضافة صنف جديد</h2>
              <p className="text-sm text-zinc-600">
                سيتم إضافة الصنف إلى مطبخ `{
                  kitchen.kitchenName
                }` وربطه به مباشرة داخل قاعدة البيانات.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium">
                اسم الصنف
              </label>
              <input
                id="name"
                name="name"
                required
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="categoryId" className="block text-sm font-medium">
                فئة الوجبة (تاكل ايه؟)
              </label>
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue=""
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
              >
                <option value="" disabled>
                  اختر الفئة
                </option>
                {FOOD_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.thumb} {category.label}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-6 text-zinc-500">
                الفئة مطلوبة حتى تظهر الوجبة في البحث وقسم تاكل ايه؟
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="orderReadiness"
                className="block text-sm font-medium"
              >
                {ORDER_READINESS_FIELD_LABEL}
              </label>
              <select
                id="orderReadiness"
                name="orderReadiness"
                required
                defaultValue="AVAILABLE_NOW"
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none"
              >
                {ORDER_READINESS_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-6 text-zinc-500">
                يظهر للعميل كـ «متى يكون جاهز؟» مع الخيار الذي تختاره.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="block text-sm font-medium">
                وصف الصنف
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="basePrice" className="block text-sm font-medium">
                  السعر الأساسي
                </label>
                <input
                  id="basePrice"
                  name="basePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="discountedPrice"
                  className="block text-sm font-medium"
                >
                  السعر بعد الخصم (اختياري)
                </label>
                <input
                  id="discountedPrice"
                  name="discountedPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
                />
                <p className="text-xs leading-6 text-zinc-500">
                  إن وُجد يظهر للعميل مشطوباً على الأساسي. يجب أن يكون أقل من
                  الأساسي وأكبر من صفر.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="depositAmount"
                  className="block text-sm font-medium"
                >
                  العربون
                </label>
                <input
                  id="depositAmount"
                  name="depositAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none"
                />
              </div>
            </div>

            <UploadField
              endpoint="menuItemImage"
              inputName="imageUrl"
              label="صورة الصنف"
              helpText="ارفع صورة واحدة واضحة للصنف في هذه المرحلة."
            />

            <div className="space-y-2">
              <label htmlFor="sizes" className="block text-sm font-medium">
                الأحجام الاختيارية
              </label>
              <textarea
                id="sizes"
                name="sizes"
                rows={5}
                placeholder={"صغير|80|20|70\nوسط|120|30\nكبير|160|40|140"}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 font-mono text-sm outline-none"
              />
              <p className="text-xs leading-6 text-zinc-500">
                كل سطر: `اسم الحجم|السعر|العربون|السعر بعد الخصم`. العربون
                والسعر بعد الخصم اختياريان. العربون ≤ 60% من السعر بعد الخصم إن
                وُجد وإلا سعر الحجم.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-4">
              <p className="text-sm text-zinc-600">
                يُرسل الصنف للاعتماد قبل ظهوره للعملاء.
              </p>
              <SubmitButton label="إرسال للاعتماد" pendingLabel="جارٍ الإرسال..." />
            </div>
          </form>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">الأصناف الحالية</h2>
                <p className="text-sm text-zinc-600">
                  عدد الأصناف الحالية: {kitchen.menuItems.length}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {kitchen.menuItems.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                  لا توجد أصناف بعد. أضف أول صنف من النموذج المقابل.
                </div>
              ) : (
                kitchen.menuItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{item.name}</h3>
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-800">
                            {getFoodCategoryById(item.categoryId)?.label ??
                              item.categoryId}
                          </span>
                          {item.isDishOfTheDay ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
                              طبق اليوم
                              {item.dishOfTheDayPrice
                                ? ` · ${String(item.dishOfTheDayPrice)} ج`
                                : ""}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                            {item.isAvailable ? "متاح" : "غير متاح"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              item.approvalStatus === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.approvalStatus === "PENDING"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-700"
                            }`}
                          >
                            {getApprovalStatusLabel(item.approvalStatus)}
                          </span>
                          {item.draftStatus === "PENDING" ? (
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700">
                              تعديل بانتظار الاعتماد
                            </span>
                          ) : null}
                          {item.draftStatus === "REJECTED" ? (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
                              تعديل مرفوض
                            </span>
                          ) : null}
                        </div>
                        {item.rejectionReason ? (
                          <p className="text-sm text-red-600">
                            سبب الرفض: {item.rejectionReason}
                          </p>
                        ) : null}
                        {item.draftRejectionReason ? (
                          <p className="text-sm text-red-600">
                            سبب رفض التعديل: {item.draftRejectionReason}
                          </p>
                        ) : null}
                        <p className="text-sm text-zinc-600">
                          السعر:{" "}
                          {item.discountedPrice
                            ? `${String(item.discountedPrice)} ج (كان ${String(item.basePrice)})`
                            : `${String(item.basePrice)} جنيه`}{" "}
                          | العربون: {String(item.depositAmount)} جنيه
                        </p>
                        <p className="text-sm text-zinc-600">
                          {ORDER_READINESS_FIELD_LABEL}:{" "}
                          {getOrderReadinessLabel(item.orderReadiness)}
                        </p>
                        {item.description ? (
                          <p className="text-sm leading-7 text-zinc-600">
                            {item.description}
                          </p>
                        ) : null}
                        {item.sizes.length ? (
                          <div className="rounded-xl bg-zinc-50 px-3 py-3 text-xs leading-6 text-zinc-600">
                            {item.sizes.map((size) => (
                              <div key={size.id}>
                                {size.sizeName}:{" "}
                                {size.discountedPrice
                                  ? `${String(size.discountedPrice)} ج (كان ${String(size.price)})`
                                  : `${String(size.price)} جنيه`}
                                {size.depositAmount
                                  ? ` | عربون ${String(size.depositAmount)}`
                                  : ""}
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        <form action={toggleMenuItemAvailability}>
                          <input type="hidden" name="menuItemId" value={item.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
                          >
                            {item.isAvailable ? "إخفاء" : "تفعيل"}
                          </button>
                        </form>
                        <form action={deleteMenuItem}>
                          <input type="hidden" name="menuItemId" value={item.id} />
                          <button
                            type="submit"
                            className="rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-600"
                          >
                            حذف
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
