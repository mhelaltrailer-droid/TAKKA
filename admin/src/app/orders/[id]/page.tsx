import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import { ConfirmReceiptButton } from "@/components/confirm-receipt-button";
import { CustomerChatForm } from "@/components/customer-chat-form";
import { DepositProofForm } from "@/components/deposit-proof-form";
import { LiveRefreshListener } from "@/components/live-refresh-listener";
import { OrderTimeline } from "@/components/order-timeline";
import { ReviewForm } from "@/components/review-form";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";

export default async function CustomerOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;

  const order = await db.order.findFirst({
    where: {
      id,
      customerId: user.appUserId,
    },
    include: {
      kitchen: {
        select: {
          kitchenName: true,
        },
      },
      customerAddress: true,
      items: {
        orderBy: {
          createdAt: "asc",
        },
      },
      depositProofs: {
        orderBy: {
          submittedAt: "desc",
        },
      },
      review: true,
      messages: {
        orderBy: {
          sentAt: "asc",
        },
        include: {
          sender: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">الطلب غير موجود</h1>
          <Link
            href="/kitchens"
            className="mt-4 inline-flex rounded-full bg-[var(--brand-primary)] px-4 py-2 text-sm font-medium text-white"
          >
            العودة للمطابخ
          </Link>
        </div>
      </main>
    );
  }

  const latestProof = order.depositProofs[0];

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <LiveRefreshListener
        channelName={`order-${order.id}`}
        eventNames={["message:new", "status:changed", "deposit:updated"]}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Link
            href="/kitchens"
            className="text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
          >
            متابعة التصفح
          </Link>
          <h1 className="mt-3 text-3xl font-bold">تفاصيل الطلب {order.orderNumber}</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            المطبخ: {order.kitchen.kitchenName} | الحالة الحالية:{" "}
            {getOrderStatusLabel(order.status)}
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <OrderTimeline
              status={order.status}
              deliveryType={order.deliveryType}
              placedAt={order.placedAt}
              acceptedAt={order.acceptedAt}
              depositSubmittedAt={order.depositSubmittedAt}
              depositConfirmedAt={order.depositConfirmedAt}
              deliveredAt={order.deliveredAt}
              completedAt={order.completedAt}
            />

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">ملخص الطلب</h2>
              <div className="mt-4 space-y-2 text-sm text-zinc-700">
                <p>المجموع: {String(order.subtotalAmount)} جنيه</p>
                <p>التوصيل: {String(order.deliveryFee)} جنيه</p>
                <p>الإجمالي: {String(order.totalAmount)} جنيه</p>
                <p>العربون: {String(order.depositAmount)} جنيه</p>
                <p>
                  طريقة الاستلام:{" "}
                  {order.deliveryType === "PICKUP" ? "استلام" : "توصيل"}
                </p>
                {order.customerAddress ? (
                  <p>العنوان: {order.customerAddress.addressLine}</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">الأصناف</h2>
              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
                  >
                    {item.itemNameSnapshot}
                    {item.sizeNameSnapshot ? ` - ${item.sizeNameSnapshot}` : ""}
                    {" × "}
                    {item.quantity}
                    {" | "}
                    {String(item.lineTotal)} جنيه
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">المحادثة</h2>
              <div className="mt-4 space-y-3">
                {order.messages.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                    لا توجد رسائل بعد.
                  </div>
                ) : (
                  order.messages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
                    >
                      <p className="font-medium">
                        {message.sender.fullName || "مستخدم"}
                      </p>
                      {message.messageText ? (
                        <p className="mt-2 leading-7 text-zinc-700">
                          {message.messageText}
                        </p>
                      ) : null}
                      {message.fileUrl ? (
                        <a
                          href={message.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex text-xs font-medium text-[var(--brand-secondary)] underline underline-offset-4"
                        >
                          فتح المرفق
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {(order.status === OrderStatus.ACCEPTED_AWAITING_DEPOSIT ||
              order.status === OrderStatus.DEPOSIT_PROOF_SUBMITTED) && (
              <DepositProofForm orderId={order.id} />
            )}

            {latestProof ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">آخر إثبات عربون</h2>
                <div className="mt-4 space-y-2 text-sm text-zinc-700">
                  <p>الحالة: {latestProof.reviewStatus}</p>
                  {latestProof.submittedAmount ? (
                    <p>المبلغ المرسل: {String(latestProof.submittedAmount)} جنيه</p>
                  ) : null}
                  <a
                    href={latestProof.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
                  >
                    فتح صورة الإثبات
                  </a>
                </div>
              </div>
            ) : null}

            {order.status === OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM ? (
              <ConfirmReceiptButton orderId={order.id} />
            ) : null}

            {order.status === OrderStatus.COMPLETED ? (
              order.review ? (
                <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">تقييمك</h2>
                  <div className="mt-4 space-y-2 text-sm text-zinc-700">
                    <p>النجوم: {order.review.ratingValue} / 5</p>
                    {order.review.comment ? (
                      <p>{order.review.comment}</p>
                    ) : (
                      <p>لم يتم إضافة تعليق.</p>
                    )}
                  </div>
                </div>
              ) : (
                <ReviewForm orderId={order.id} />
              )
            ) : null}

            {order.status !== OrderStatus.PENDING_KITCHEN_APPROVAL &&
            order.status !== OrderStatus.REJECTED_BY_KITCHEN ? (
              <CustomerChatForm orderId={order.id} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
