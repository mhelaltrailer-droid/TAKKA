import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import { StatusPill } from "@/components/status-pill";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";
import {
  getDeliveryTypeLabel,
  getDepositReviewStatusLabel,
} from "@/lib/status-labels";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireRole(["admin"]);
  const { orderId } = await params;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        select: {
          fullName: true,
          email: true,
          phoneNumber: true,
        },
      },
      kitchen: {
        select: {
          kitchenName: true,
          slug: true,
        },
      },
      customerAddress: {
        include: { region: true },
      },
      items: { orderBy: { createdAt: "asc" } },
      messages: {
        orderBy: { sentAt: "asc" },
        include: {
          sender: {
            select: {
              fullName: true,
              role: true,
            },
          },
        },
      },
      depositProofs: {
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!order) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">المحادثة غير موجودة</h1>
          <Link
            href="/dashboard/admin/chats"
            className="mt-4 inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            العودة للأرشيف
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm print:shadow-none">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
                <StatusPill
                  label={getOrderStatusLabel(order.status)}
                  tone={
                    order.status === OrderStatus.COMPLETED ? "success" : "info"
                  }
                />
                <StatusPill
                  label={getDeliveryTypeLabel(order.deliveryType)}
                  tone="warning"
                />
              </div>
              <p className="mt-3 text-sm leading-7 text-zinc-600">
                أرشيف محادثة الطلب بين العميل والمطبخ — مرجع إداري عند النزاعات.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Link
                href="/dashboard/admin/chats"
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
              >
                الأرشيف
              </Link>
            </div>
          </div>

          <div className="mt-4 print:hidden">
            <PrintButtons orderId={order.id} />
          </div>

          <div className="mt-5 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            <p>العميل: {order.customer.fullName || "غير محدد"}</p>
            <p>المطبخ: {order.kitchen.kitchenName}</p>
            <p>هاتف العميل: {order.customer.phoneNumber || "—"}</p>
            <p>بريد العميل: {order.customer.email || "—"}</p>
            <p>تاريخ الطلب: {formatDate(order.placedAt)}</p>
            <p>اكتمال الطلب: {formatDate(order.completedAt)}</p>
            <p>سعر الأصناف: {String(order.subtotalAmount)} جنيه</p>
            <p>رسوم التوصيل: {String(order.deliveryFee)} جنيه</p>
            <p>الإجمالي: {String(order.totalAmount)} جنيه</p>
            <p>العربون: {String(order.depositAmount)} جنيه</p>
            {order.customerAddress ? (
              <p className="sm:col-span-2">
                العنوان: {order.customerAddress.addressLine} —{" "}
                {order.customerAddress.region.regionName} /{" "}
                {order.customerAddress.region.cityName}
              </p>
            ) : null}
            {order.customerNotes ? (
              <p className="sm:col-span-2">ملاحظات العميل: {order.customerNotes}</p>
            ) : null}
          </div>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">أصناف الطلب</h2>
          <div className="mt-3 space-y-2 text-sm text-zinc-700">
            {order.items.map((item) => (
              <div key={item.id} className="rounded-xl bg-zinc-50 px-3 py-2">
                {item.itemNameSnapshot}
                {item.sizeNameSnapshot ? ` - ${item.sizeNameSnapshot}` : ""} ×{" "}
                {item.quantity} | {String(item.lineTotal)} جنيه
                {item.customerNote ? (
                  <span className="mt-1 block text-xs text-zinc-500">
                    ملاحظة: {item.customerNote}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">إثبات العربون الرسمي</h2>
          <div className="mt-4 space-y-4">
            {order.depositProofs.length === 0 ? (
              <p className="text-sm text-zinc-500">لا توجد إثباتات عربون.</p>
            ) : (
              order.depositProofs.map((proof) => (
                <div
                  key={proof.id}
                  className="rounded-2xl border border-zinc-200 p-4 text-sm"
                >
                  <p>
                    الحالة: {getDepositReviewStatusLabel(proof.reviewStatus)}
                  </p>
                  <p className="mt-1">تاريخ الإرسال: {formatDate(proof.submittedAt)}</p>
                  {proof.submittedAmount ? (
                    <p className="mt-1">
                      المبلغ: {String(proof.submittedAmount)} جنيه
                    </p>
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proof.imageUrl}
                    alt="إثبات عربون"
                    className="mt-3 max-h-72 w-full rounded-xl object-contain bg-zinc-50"
                  />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">سجل المحادثة</h2>
          <div className="mt-4 space-y-3">
            {order.messages.length === 0 ? (
              <p className="text-sm text-zinc-500">لا توجد رسائل في هذه المحادثة.</p>
            ) : (
              order.messages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {message.sender.fullName || "مستخدم"}{" "}
                      <span className="text-xs font-normal text-zinc-500">
                        ({message.sender.role})
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDate(message.sentAt)}
                    </p>
                  </div>
                  {message.messageText ? (
                    <p className="mt-2 leading-7 text-zinc-700">
                      {message.messageText}
                    </p>
                  ) : null}
                  {message.fileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.fileUrl}
                      alt="مرفق محادثة"
                      className="mt-3 max-h-80 w-full rounded-xl object-contain bg-zinc-50"
                    />
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function PrintButtons({ orderId }: { orderId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`/api/admin/orders/${orderId}/chat-pdf`}
        className="rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
      >
        تحميل PDF كامل (تفاصيل + صور)
      </a>
      <Link
        href={`/dashboard/admin/chats/${orderId}/print`}
        className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
      >
        نسخة عربية للطباعة / حفظ PDF
      </Link>
    </div>
  );
}
