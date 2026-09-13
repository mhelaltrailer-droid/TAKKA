import { DeliveryType, OrderStatus } from "@prisma/client";

import { getCustomerOrderStage } from "@/lib/customer-order-status";

type OrderTimelineProps = {
  status: OrderStatus;
  deliveryType: DeliveryType;
  placedAt: Date;
  acceptedAt: Date | null;
  depositSubmittedAt: Date | null;
  depositConfirmedAt: Date | null;
  deliveredAt: Date | null;
  completedAt: Date | null;
};

type TimelineStep = {
  key: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  timestamp?: Date | null;
};

export function OrderTimeline({
  status,
  deliveryType,
  placedAt,
  acceptedAt,
  depositSubmittedAt,
  depositConfirmedAt,
  deliveredAt,
  completedAt,
}: OrderTimelineProps) {
  const stage = getCustomerOrderStage(status);
  const isRejected = stage === "REJECTED";
  const isCancelled = stage === "CANCELLED";
  const isTerminalFail = isRejected || isCancelled;

  const pastKitchen =
    stage !== "AWAITING_KITCHEN" && !isRejected;
  const pastDeposit =
    stage === "PREPARING" ||
    stage === "ON_THE_WAY" ||
    stage === "CONFIRM_RECEIPT" ||
    stage === "COMPLETED";
  const pastPreparing =
    stage === "ON_THE_WAY" ||
    stage === "CONFIRM_RECEIPT" ||
    stage === "COMPLETED";
  const pastDelivery =
    stage === "CONFIRM_RECEIPT" || stage === "COMPLETED";

  const steps: TimelineStep[] = [
    {
      key: "placed",
      title: "تم إرسال الطلب",
      description: "وصل الطلب للمطبخ وبانتظار مراجعته.",
      completed: true,
      active: stage === "AWAITING_KITCHEN",
      timestamp: placedAt,
    },
    {
      key: "accepted",
      title: "موافقة المطبخ",
      description: isRejected
        ? "المطبخ رفض الطلب."
        : "المطبخ قبل الطلب وحدّد إمكانية التنفيذ.",
      completed: pastKitchen && !isCancelled,
      active: false,
      timestamp: acceptedAt,
    },
    {
      key: "deposit",
      title: "العربون",
      description:
        stage === "DEPOSIT_REVIEW"
          ? "تم إرسال الإثبات وبانتظار مراجعة المطبخ."
          : stage === "PAY_DEPOSIT"
            ? "حوّل العربون وأرسل صورة الإثبات."
            : "تم تأكيد العربون.",
      completed: pastDeposit,
      active: stage === "PAY_DEPOSIT" || stage === "DEPOSIT_REVIEW",
      timestamp: depositConfirmedAt ?? depositSubmittedAt,
    },
    {
      key: "preparing",
      title: "التحضير",
      description: "المطبخ بيجهّز طلبك.",
      completed: pastPreparing,
      active: stage === "PREPARING",
      timestamp: depositConfirmedAt,
    },
    {
      key: "delivery",
      title:
        deliveryType === DeliveryType.PICKUP ? "الاستلام" : "التوصيل",
      description:
        deliveryType === DeliveryType.PICKUP
          ? "الطلب جاهز للاستلام من المطبخ."
          : "الطلب في الطريق إليك.",
      completed: pastDelivery,
      active: stage === "ON_THE_WAY",
      timestamp: deliveredAt,
    },
    {
      key: "done",
      title: stage === "COMPLETED" ? "مكتمل" : "تأكيد الاستلام",
      description:
        stage === "COMPLETED"
          ? "تم إنهاء الطلب."
          : "ادفع الباقي عند الاستلام ثم أكّد إنك استلمت.",
      completed: stage === "COMPLETED",
      active: stage === "CONFIRM_RECEIPT",
      timestamp: completedAt,
    },
  ];

  if (isTerminalFail) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">مراحل الطلب</h2>
        <p className="mt-4 text-sm leading-7 text-zinc-600">
          {isRejected
            ? "انتهى هذا الطلب بالرفض من المطبخ."
            : "تم إلغاء هذا الطلب."}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          {placedAt.toLocaleString("ar-EG")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">مراحل الطلب</h2>
      <div className="mt-5 space-y-4">
        {steps.map((step, index) => (
          <div key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  step.completed
                    ? "bg-emerald-600 text-white"
                    : step.active
                      ? "bg-[var(--brand-primary)] text-white"
                      : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 ? (
                <div className="mt-2 h-full w-px bg-zinc-200" />
              ) : null}
            </div>

            <div className="pb-4">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm leading-7 text-zinc-600">
                {step.description}
              </p>
              {step.timestamp ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {step.timestamp.toLocaleString("ar-EG")}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
