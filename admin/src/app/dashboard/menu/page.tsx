import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { UploadField } from "@/components/upload-field";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getApprovalStatusLabel } from "@/lib/status-labels";

import {
  createMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "./actions";

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
            أكمل `Kitchen Onboarding` أولًا حتى نستطيع ربط الأصناف بالمطبخ
            الصحيح.
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

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Menu Management
          </p>
          <h1 className="mt-2 text-3xl font-bold">إدارة المنيو</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            من هنا يستطيع صاحب المطبخ إضافة الأصناف، تحديد السعر، العربون،
            الصورة، والأحجام الاختيارية. حالة الاعتماد الحالية للمطبخ:
          </p>
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
        </header>

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

            <div className="grid gap-6 md:grid-cols-2">
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
                placeholder={"صغير|80|20\nوسط|120|30\nكبير|160|40"}
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 font-mono text-sm outline-none"
              />
              <p className="text-xs leading-6 text-zinc-500">
                كل سطر بصيغة: `اسم الحجم|السعر|العربون`. العربون في الحجم
                اختياري لكن لا يجب أن يتجاوز 60% من سعر الحجم.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-50 px-4 py-4">
              <p className="text-sm text-zinc-600">
                سيتم تفعيل الصنف مباشرة بحالة `متاح`.
              </p>
              <SubmitButton label="إضافة الصنف" pendingLabel="جارٍ إنشاء الصنف..." />
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
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-700">
                            {item.isAvailable ? "متاح" : "غير متاح"}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600">
                          السعر: {String(item.basePrice)} جنيه | العربون:{" "}
                          {String(item.depositAmount)} جنيه
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
                                {size.sizeName}: {String(size.price)} جنيه
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
