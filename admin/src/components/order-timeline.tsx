import { DeliveryType, OrderStatus } from "@prisma/client";

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
  const steps: TimelineStep[] = [
    {
      key: "placed",
      title: "تم إنشاء الطلب",
      description: "تم إرسال الطلب إلى المطبخ وبانتظار مراجعته.",
      completed: true,
      active: status === OrderStatus.PENDING_KITCHEN_APPROVAL,
      timestamp: placedAt,
    },
    {
      key: "accepted",
      title: "تم قبول الطلب",
      description: "راجع المطبخ الطلب وحدد إمكانية تنفيذه.",
      completed:
        status !== OrderStatus.PENDING_KITCHEN_APPROVAL &&
        status !== OrderStatus.REJECTED_BY_KITCHEN,
      active: status === OrderStatus.ACCEPTED_AWAITING_DEPOSIT,
      timestamp: acceptedAt,
    },
    {
      key: "deposit",
      title: "العربون",
      description:
        status === OrderStatus.DEPOSIT_PROOF_SUBMITTED
          ? "تم إرسال إثبات العربون وبانتظار مراجعته."
          : "العربون مطلوب قبل بدء التحضير.",
      completed:
        status === OrderStatus.DEPOSIT_CONFIRMED ||
        status === OrderStatus.PREPARING ||
        status === OrderStatus.READY_FOR_PICKUP ||
        status === OrderStatus.AWAITING_CUSTOMER_ARRIVAL ||
        status === OrderStatus.OUT_FOR_DELIVERY ||
        status === OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER ||
        status === OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM ||
        status === OrderStatus.COMPLETED,
      active:
        status === OrderStatus.ACCEPTED_AWAITING_DEPOSIT ||
        status === OrderStatus.DEPOSIT_PROOF_SUBMITTED,
      timestamp: depositSubmittedAt ?? depositConfirmedAt,
    },
    {
      key: "preparing",
      title: "جاري التحضير",
      description: "بدأ المطبخ تجهيز الطلب.",
      completed:
        status === OrderStatus.READY_FOR_PICKUP ||
        status === OrderStatus.AWAITING_CUSTOMER_ARRIVAL ||
        status === OrderStatus.OUT_FOR_DELIVERY ||
        status === OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER ||
        status === OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM ||
        status === OrderStatus.COMPLETED,
      active: status === OrderStatus.PREPARING,
      timestamp: depositConfirmedAt,
    },
    {
      key: "delivery",
      title:
        deliveryType === DeliveryType.PICKUP
          ? "جاهز للاستلام"
          : "خرج للتوصيل / تم التسليم",
      description:
        deliveryType === DeliveryType.PICKUP
          ? "الطلب جاهز ويمكنك التوجه لاستلامه."
          : "الطلب خرج للتوصيل أو تم تسليمه لجهة التوصيل.",
      completed:
        status === OrderStatus.DELIVERED_BY_KITCHEN_OR_DRIVER ||
        status === OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM ||
        status === OrderStatus.COMPLETED,
      active:
        status === OrderStatus.READY_FOR_PICKUP ||
        status === OrderStatus.AWAITING_CUSTOMER_ARRIVAL ||
        status === OrderStatus.OUT_FOR_DELIVERY,
      timestamp: deliveredAt,
    },
    {
      key: "completed",
      title: "اكتمل الطلب",
      description: "تم التسليم النهائي أو بانتظار تأكيد الاستلام.",
      completed: status === OrderStatus.COMPLETED,
      active: status === OrderStatus.COMPLETED_AWAITING_CUSTOMER_CONFIRM,
      timestamp: completedAt,
    },
  ];

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
