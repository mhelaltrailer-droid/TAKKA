/** Fixed checkout pricing copy — keep in sync with Flutter. */
export const CHECKOUT_PRICING_SUMMARY = [
  "العربون الآن",
  "التوصيل بعد القبول",
  "الباقي عند الاستلام",
] as const;

export function CheckoutPricingSummary({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950 ${className}`}
    >
      <p className="font-semibold">قبل إرسال الطلب</p>
      <p className="mt-1">{CHECKOUT_PRICING_SUMMARY.join(" · ")}</p>
    </div>
  );
}
