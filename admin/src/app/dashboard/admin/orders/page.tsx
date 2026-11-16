import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderIssueTypeLabel } from "@/lib/order-issues";
import { getOrderStatusLabel } from "@/lib/order-status";

import { resolveOrderIssue, setReviewVisibility } from "./actions";

export default async function AdminOrdersPage() {
  await requireRole(["admin"]);

  const [openIssues, recentReviews] = await Promise.all([
    db.orderIssue.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
          },
        },
        kitchen: { select: { kitchenName: true } },
        customer: { select: { fullName: true, phoneNumber: true } },
      },
    }),
    db.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        customer: { select: { fullName: true } },
        kitchen: { select: { id: true, kitchenName: true } },
        order: { select: { orderNumber: true } },
      },
    }),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            طلبات العملاء
          </p>
          <h1 className="mt-2 text-3xl font-bold">مشاكل الطلبات والتقييمات</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            الشكاوى بتتسجل هنا لما العميل يفتح واتساب من صفحة الطلب. مفيش رسالة
            بتتبعت لوحدها من السيرفر.
          </p>
          <Link
            href="/dashboard/admin"
            className="mt-4 inline-flex text-sm font-medium text-[var(--brand-secondary)] underline"
          >
            العودة للوحة الإدارة
          </Link>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            مشاكل مفتوحة ({openIssues.length})
          </h2>
          <div className="mt-5 space-y-4">
            {openIssues.length === 0 ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                مفيش مشاكل مفتوحة دلوقتي.
              </p>
            ) : (
              openIssues.map((issue) => (
                <article
                  key={issue.id}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{issue.order.orderNumber}</p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {issue.kitchen.kitchenName} ·{" "}
                        {issue.customer.fullName || "عميل"}
                        {issue.customer.phoneNumber
                          ? ` · ${issue.customer.phoneNumber}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#3b2418]">
                        {orderIssueTypeLabel(issue.type)}
                      </p>
                      {issue.note ? (
                        <p className="mt-2 text-sm leading-7 text-zinc-700">
                          {issue.note}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs text-zinc-500">
                        {issue.createdAt.toLocaleString("ar-EG")} ·{" "}
                        {getOrderStatusLabel(issue.order.status)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/dashboard/admin/chats/${issue.order.id}`}
                        className="rounded-full border border-zinc-300 px-4 py-2 text-center text-sm font-medium"
                      >
                        المحادثة
                      </Link>
                      <form action={resolveOrderIssue}>
                        <input type="hidden" name="issueId" value={issue.id} />
                        <button
                          type="submit"
                          className="w-full rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          تم الحل
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">آخر التقييمات</h2>
          <p className="mt-2 text-sm leading-7 text-zinc-600">
            المطبخ مش بيقدر يعدل أو يمسح التقييم. الإخفاء من هنا بس، وبيتشال من
            صفحة المطبخ ومن متوسط التقييم.
          </p>
          <div className="mt-5 space-y-4">
            {recentReviews.length === 0 ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                مفيش تقييمات بعد.
              </p>
            ) : (
              recentReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">
                        {review.kitchen.kitchenName} · {review.ratingValue}/5
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        {review.customer.fullName || "عميل"} · طلب{" "}
                        {review.order.orderNumber}
                        {review.visibility === "HIDDEN" ? " · مخفي" : ""}
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
                        value={
                          review.visibility === "HIDDEN" ? "VISIBLE" : "HIDDEN"
                        }
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
                  </div>
                  <Link
                    href={`/dashboard/admin/kitchens/${review.kitchen.id}`}
                    className="mt-3 inline-flex text-sm font-medium text-[var(--brand-secondary)] underline"
                  >
                    صفحة المطبخ
                  </Link>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
