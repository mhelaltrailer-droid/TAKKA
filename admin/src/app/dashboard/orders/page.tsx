import Link from "next/link";
import { DeliveryType, OrderStatus } from "@prisma/client";

import { LiveRefreshListener } from "@/components/live-refresh-listener";
import { StatusPill } from "@/components/status-pill";
import { UploadField } from "@/components/upload-field";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getAllowedNextStatuses,
  getOrderStatusLabel,
} from "@/lib/order-status";
import {
  getDeliveryTypeLabel,
  getDepositReviewStatusLabel,
} from "@/lib/status-labels";

import {
  acceptOrder,
  approveDepositProof,
  rejectDepositProof,
  rejectOrder,
  sendKitchenOrderMessage,
  updateOrderStatus,
} from "./actions";

export default async function OrdersPage() {
  const user = await requireAuth();

  const kitchen = await db.kitchen.findUnique({
    where: {
      ownerUserId: user.appUserId,
    },
    select: {
      id: true,
      kitchenName: true,
      orders: {
        include: {
          customer: {
            select: {
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          customerAddress: true,
          depositProofs: {
            orderBy: {
              submittedAt: "desc",
            },
          },
          messages: {
            orderBy: {
              sentAt: "asc",
            },
            take: 10,
            include: {
              sender: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          items: {
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
            أكمل إعداد المطبخ أولًا حتى نستطيع عرض الطلبات الخاصة به.
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

  const ordersSummary = {
    pending: kitchen.orders.filter(
      (order) => order.status === OrderStatus.PENDING_KITCHEN_APPROVAL,
    ).length,
    waitingDeposit: kitchen.orders.filter(
      (order) =>
        order.status === OrderStatus.ACCEPTED_AWAITING_DEPOSIT ||
        order.status === OrderStatus.DEPOSIT_PROOF_SUBMITTED,
    ).length,
    active: kitchen.orders.filter((order) =>
      ([
        OrderStatus.DEPOSIT_CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY_FOR_PICKUP,
        OrderStatus.AWAITING_CUSTOMER_ARRIVAL,
        OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER,
        OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM,
      ] as OrderStatus[]).includes(order.status),
    ).length,
    completed: kitchen.orders.filter(
      (order) => order.status === OrderStatus.COMPLETED,
    ).length,
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <LiveRefreshListener
        channelName={`user-${user.appUserId}`}
        eventNames={["notification:new"]}
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-[var(--brand-secondary)]">
            Orders Core
          </p>
          <h1 className="mt-2 text-3xl font-bold">إدارة الطلبات</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
            هذه أول لوحة تشغيلية لطلبات مطبخ `{kitchen.kitchenName}` وتشمل
            القبول، الرفض، رسوم التوصيل، وتحريك حالات الطلب الأساسية.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">بانتظار المراجعة</p>
            <p className="mt-2 text-2xl font-bold">{ordersSummary.pending}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">بانتظار العربون</p>
            <p className="mt-2 text-2xl font-bold">
              {ordersSummary.waitingDeposit}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">طلبات جارية</p>
            <p className="mt-2 text-2xl font-bold">{ordersSummary.active}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-zinc-500">طلبات مكتملة</p>
            <p className="mt-2 text-2xl font-bold">{ordersSummary.completed}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/kitchen/onboarding"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              إعداد المطبخ
            </Link>
            <Link
              href="/dashboard/menu"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              إدارة المنيو
            </Link>
            <Link
              href="/dashboard/orders"
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium"
            >
              تحديث الطلبات
            </Link>
          </div>

          <div className="space-y-5">
            {kitchen.orders.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                لا توجد طلبات بعد. بمجرد استخدام `POST /api/orders` أو ربط
                تطبيق العميل، ستظهر الطلبات هنا تلقائيًا.
              </div>
            ) : (
              kitchen.orders.map((order) => {
                const allowedStatuses = getAllowedNextStatuses(
                  order.status,
                  order.deliveryType,
                );
                const latestProof = order.depositProofs[0];

                return (
                  <article
                    key={order.id}
                    className="rounded-2xl border border-zinc-200 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">
                            {order.orderNumber}
                          </h2>
                          <StatusPill
                            label={getOrderStatusLabel(order.status)}
                            tone="info"
                          />
                          <StatusPill
                            label={getDeliveryTypeLabel(order.deliveryType)}
                            tone="warning"
                          />
                        </div>

                        <div className="text-sm leading-7 text-zinc-600">
                          <p>
                            العميل: {order.customer.fullName || "غير محدد"}
                          </p>
                          <p>
                            وسيلة التواصل:{" "}
                            {order.customer.phoneNumber ||
                              order.customer.email ||
                              "غير متوفرة"}
                          </p>
                          {order.customerAddress ? (
                            <p>
                              عنوان الطلب: {order.customerAddress.addressLine}
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm leading-7 text-zinc-700">
                          {order.items.map((item) => (
                            <div key={item.id}>
                              {item.itemNameSnapshot}
                              {item.sizeNameSnapshot
                                ? ` - ${item.sizeNameSnapshot}`
                                : ""}
                              {" × "}
                              {item.quantity}
                              {" | "}
                              {String(item.lineTotal)} جنيه
                            </div>
                          ))}
                        </div>

                        <div className="text-sm text-zinc-700">
                          <p>المجموع: {String(order.subtotalAmount)} جنيه</p>
                          <p>التوصيل: {String(order.deliveryFee)} جنيه</p>
                          <p>الإجمالي: {String(order.totalAmount)} جنيه</p>
                          <p>العربون: {String(order.depositAmount)} جنيه</p>
                        </div>

                        {latestProof ? (
                          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
                            <p className="font-medium">آخر إثبات عربون</p>
                            <p className="mt-2">
                              الحالة:{" "}
                              {getDepositReviewStatusLabel(latestProof.reviewStatus)}
                            </p>
                            {latestProof.submittedAmount ? (
                              <p>
                                المبلغ المرسل: {String(latestProof.submittedAmount)} جنيه
                              </p>
                            ) : null}
                            <a
                              href={latestProof.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3 inline-flex text-sm font-medium text-[var(--brand-secondary)] underline underline-offset-4"
                            >
                              فتح صورة الإثبات
                            </a>
                          </div>
                        ) : null}

                        {order.status !== OrderStatus.PENDING_KITCHEN_APPROVAL &&
                        order.status !== OrderStatus.REJECTED_BY_KITCHEN ? (
                          <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-sm font-medium">محادثة الطلب</p>
                              <span className="text-xs text-zinc-500">
                                آخر {order.messages.length} رسالة
                              </span>
                            </div>
                            <div className="space-y-2">
                              {order.messages.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                  لا توجد رسائل بعد.
                                </p>
                              ) : (
                                order.messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className="rounded-xl bg-zinc-50 px-3 py-3 text-sm"
                                  >
                                    <p className="font-medium">
                                      {message.sender.fullName || "مستخدم"}
                                    </p>
                                    {message.messageText ? (
                                      <p className="mt-1 leading-7 text-zinc-700">
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
                                        فتح الصورة
                                      </a>
                                    ) : null}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="w-full max-w-sm space-y-3">
                        {order.status === OrderStatus.PENDING_KITCHEN_APPROVAL ? (
                          <>
                            <form
                              action={acceptOrder}
                              className="rounded-2xl bg-zinc-50 p-4"
                            >
                              <input type="hidden" name="orderId" value={order.id} />
                              {order.deliveryType === DeliveryType.DELIVERY ? (
                                <div className="mb-3 space-y-2">
                                  <label
                                    htmlFor={`deliveryFee-${order.id}`}
                                    className="block text-sm font-medium"
                                  >
                                    رسوم التوصيل
                                  </label>
                                  <input
                                    id={`deliveryFee-${order.id}`}
                                    name="deliveryFee"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    defaultValue={0}
                                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none"
                                  />
                                </div>
                              ) : null}
                              <button
                                type="submit"
                                className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
                              >
                                قبول الطلب
                              </button>
                            </form>

                            <form action={rejectOrder}>
                              <input type="hidden" name="orderId" value={order.id} />
                              <button
                                type="submit"
                                className="w-full rounded-full border border-red-200 px-4 py-3 text-sm font-medium text-red-600"
                              >
                                رفض الطلب
                              </button>
                            </form>
                          </>
                        ) : order.status === OrderStatus.DEPOSIT_PROOF_SUBMITTED &&
                          latestProof ? (
                          <>
                            <form action={approveDepositProof}>
                              <input type="hidden" name="orderId" value={order.id} />
                              <input
                                type="hidden"
                                name="depositProofId"
                                value={latestProof.id}
                              />
                              <button
                                type="submit"
                                className="w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-medium text-white"
                              >
                                قبول إثبات العربون
                              </button>
                            </form>
                            <form action={rejectDepositProof}>
                              <input type="hidden" name="orderId" value={order.id} />
                              <input
                                type="hidden"
                                name="depositProofId"
                                value={latestProof.id}
                              />
                              <button
                                type="submit"
                                className="w-full rounded-full border border-red-200 px-4 py-3 text-sm font-medium text-red-600"
                              >
                                رفض الإثبات
                              </button>
                            </form>
                          </>
                        ) : allowedStatuses.length > 0 ? (
                          <form
                            action={updateOrderStatus}
                            className="rounded-2xl bg-zinc-50 p-4"
                          >
                            <input type="hidden" name="orderId" value={order.id} />
                            <div className="mb-3 space-y-2">
                              <label
                                htmlFor={`nextStatus-${order.id}`}
                                className="block text-sm font-medium"
                              >
                                الحالة التالية
                              </label>
                              <select
                                id={`nextStatus-${order.id}`}
                                name="nextStatus"
                                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none"
                              >
                                {allowedStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {getOrderStatusLabel(status)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="submit"
                              className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-3 text-sm font-medium text-white"
                            >
                              تحديث الحالة
                            </button>
                          </form>
                        ) : (
                          <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-600">
                            لا توجد إجراءات متاحة لهذه الحالة حاليًا.
                          </div>
                        )}

                        {order.status !== OrderStatus.PENDING_KITCHEN_APPROVAL &&
                        order.status !== OrderStatus.REJECTED_BY_KITCHEN ? (
                          <form
                            action={sendKitchenOrderMessage}
                            className="rounded-2xl bg-zinc-50 p-4"
                          >
                            <input type="hidden" name="orderId" value={order.id} />
                            <div className="mb-3 space-y-2">
                              <label
                                htmlFor={`messageText-${order.id}`}
                                className="block text-sm font-medium"
                              >
                                إرسال رسالة
                              </label>
                              <textarea
                                id={`messageText-${order.id}`}
                                name="messageText"
                                rows={3}
                                className="w-full rounded-xl border border-zinc-300 px-3 py-2 outline-none"
                                placeholder="اكتب رسالة للعميل..."
                              />
                            </div>
                            <UploadField
                              endpoint="chatImage"
                              inputName="imageUrl"
                              label="أو أرفق صورة"
                              helpText="يمكنك إرفاق صورة واحدة مع الرسالة."
                            />
                            <div className="mt-3">
                              <button
                                type="submit"
                                className="w-full rounded-full bg-[var(--brand-primary)] px-4 py-3 text-sm font-medium text-white"
                              >
                                إرسال الرسالة
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
