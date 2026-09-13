"use client";

import { useEffect } from "react";

type PrintTriggerProps = {
  title: string;
  backHref: string;
};

export function PrintTrigger({ title, backHref }: PrintTriggerProps) {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="mb-6 flex flex-wrap gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-full bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-medium text-white"
      >
        طباعة / حفظ كـ PDF
      </button>
      <a
        href={backHref}
        className="rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium"
      >
        رجوع للتفاصيل
      </a>
      <p className="w-full text-xs leading-6 text-zinc-500">
        من نافذة الطباعة اختر «حفظ كـ PDF» للحصول على نسخة عربية كاملة بالصور.
      </p>
    </div>
  );
}
