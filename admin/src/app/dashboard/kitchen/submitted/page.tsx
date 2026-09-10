"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function KitchenOnboardingSubmittedPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"review" | "redirect">("review");

  useEffect(() => {
    const reviewTimer = window.setTimeout(() => {
      setPhase("redirect");
    }, 1600);

    const redirectTimer = window.setTimeout(() => {
      router.replace("/dashboard");
    }, 3200);

    return () => {
      window.clearTimeout(reviewTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">تم إرسال بيانات المطبخ</h1>
        <p className="mt-4 text-base leading-8 text-zinc-700">
          سوف يتم مراجعة بياناتك من التطبيق
        </p>
        <p className="mt-3 text-sm font-medium text-[var(--brand-secondary)]">
          {phase === "review"
            ? "جارٍ تجهيز لوحة التحكم..."
            : "جاري تحويلك إلى لوحة التحكم"}
        </p>
        <div className="mx-auto mt-6 h-1.5 w-40 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-700"
            style={{ width: phase === "review" ? "45%" : "100%" }}
          />
        </div>
      </div>
    </main>
  );
}
