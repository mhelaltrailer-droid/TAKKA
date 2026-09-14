"use client";

import {
  formatKitchenPhoneForDisplay,
  kitchenTelHref,
  kitchenWhatsAppHref,
} from "@/lib/kitchen-contact";

export function KitchenContactCard({
  kitchenName,
  phoneNumber,
}: {
  kitchenName: string;
  phoneNumber: string;
}) {
  const display = formatKitchenPhoneForDisplay(phoneNumber);
  const tel = kitchenTelHref(phoneNumber);
  const whatsapp = kitchenWhatsAppHref(phoneNumber);

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-emerald-950">تواصل مع المطبخ</h2>
      <p className="mt-2 text-sm leading-7 text-emerald-900">
        تم قبول طلبك من «{kitchenName}». يمكنك التواصل عبر شات الطلب في التطبيق،
        أو الاتصال / واتساب مباشرة.
      </p>
      <p className="mt-4 text-lg font-bold tracking-wide text-emerald-950" dir="ltr">
        {display}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {tel ? (
          <a
            href={tel}
            className="inline-flex rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            اتصال
          </a>
        ) : null}
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-emerald-400 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-950"
          >
            واتساب
          </a>
        ) : null}
      </div>
    </div>
  );
}
