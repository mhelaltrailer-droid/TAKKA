import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrderStatusLabel } from "@/lib/order-status";
import {
  getDeliveryTypeLabel,
  getDepositReviewStatusLabel,
} from "@/lib/status-labels";
import { PrintTrigger } from "@/components/print-trigger";

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminChatPrintPage({
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
    return <p className="p-8">الطلب غير موجود.</p>;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-8 text-zinc-900" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <PrintTrigger
          title={`تكة — أرشيف ${order.orderNumber}`}
          backHref={`/dashboard/admin/chats/${order.id}`}
        />

        <header className="border-b border-zinc-300 pb-4">
          <h1 className="text-2xl font-bold">أرشيف محادثة تكّة</h1>
          <p className="mt-2 text-lg font-semibold">{order.orderNumber}</p>
          <p className="mt-1 text-sm">
            الحالة: {getOrderStatusLabel(order.status)} |{" "}
            {getDeliveryTypeLabel(order.deliveryType)}
          </p>
        </header>

        <section className="mt-5 space-y-1 text-sm leading-7">
          <p>العميل: {order.customer.fullName || "—"}</p>
          <p>هاتف العميل: {order.customer.phoneNumber || "—"}</p>
          <p>بريد العميل: {order.customer.email || "—"}</p>
          <p>المطبخ: {order.kitchen.kitchenName}</p>
          <p>تاريخ الطلب: {formatDate(order.placedAt)}</p>
          <p>تاريخ الاكتمال: {formatDate(order.completedAt)}</p>
          <p>سعر الأصناف: {String(order.subtotalAmount)} جنيه</p>
          <p>رسوم التوصيل: {String(order.deliveryFee)} جنيه</p>
          <p>الإجمالي: {String(order.totalAmount)} جنيه</p>
          <p>العربون: {String(order.depositAmount)} جنيه</p>
          {order.customerAddress ? (
            <p>
              العنوان: {order.customerAddress.addressLine} —{" "}
              {order.customerAddress.region.regionName} /{" "}
              {order.customerAddress.region.cityName}
            </p>
          ) : null}
          {order.customerNotes ? <p>ملاحظات: {order.customerNotes}</p> : null}
          {order.customerContactPhone ? (
            <p>هاتف تواصل آخر: {order.customerContactPhone}</p>
          ) : null}
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">الأصناف</h2>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-sm">
            {order.items.map((item) => (
              <li key={item.id}>
                {item.itemNameSnapshot}
                {item.sizeNameSnapshot ? ` - ${item.sizeNameSnapshot}` : ""} ×{" "}
                {item.quantity} | {String(item.lineTotal)} جنيه
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">إثبات العربون الرسمي</h2>
          {order.depositProofs.length === 0 ? (
            <p className="mt-2 text-sm">لا توجد إثباتات.</p>
          ) : (
            <div className="mt-3 space-y-4">
              {order.depositProofs.map((proof) => (
                <div key={proof.id} className="break-inside-avoid">
                  <p className="text-sm">
                    {formatDate(proof.submittedAt)} —{" "}
                    {getDepositReviewStatusLabel(proof.reviewStatus)}
                    {proof.submittedAmount
                      ? ` — ${String(proof.submittedAmount)} جنيه`
                      : ""}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proof.imageUrl}
                    alt="إثبات عربون"
                    className="mt-2 max-h-96 w-full object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="text-lg font-semibold">المحادثة</h2>
          <div className="mt-3 space-y-4">
            {order.messages.length === 0 ? (
              <p className="text-sm">لا توجد رسائل.</p>
            ) : (
              order.messages.map((message) => (
                <article key={message.id} className="break-inside-avoid border-b border-zinc-200 pb-3">
                  <p className="text-sm font-semibold">
                    {message.sender.fullName || "مستخدم"} ({message.sender.role}) —{" "}
                    {formatDate(message.sentAt)}
                  </p>
                  {message.messageText ? (
                    <p className="mt-1 text-sm leading-7">{message.messageText}</p>
                  ) : null}
                  {message.fileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={message.fileUrl}
                      alt="مرفق"
                      className="mt-2 max-h-96 w-full object-contain"
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
