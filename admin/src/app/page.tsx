import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#1a120e] text-[#fff8f1]">
      <section className="relative isolate min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/takka-hero.jpg')" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-l from-[#1a120e]/92 via-[#1a120e]/72 to-[#1a120e]/35"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(230,126,34,0.35),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(198,93,46,0.25),transparent_35%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-between px-6 py-8 md:px-10 md:py-10">
          <header className="flex items-center justify-between gap-4">
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-white md:text-4xl">
              تكة
            </p>
            {isClerkConfigured ? (
              <div className="flex items-center gap-3">
                <SignedOut>
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-white/85 transition hover:text-white"
                  >
                    دخول
                  </Link>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            ) : null}
          </header>

          <div className="max-w-2xl space-y-7 pb-10 pt-16 md:pb-16 md:pt-8">
            <h1 className="animate-[fadeRise_0.9s_ease-out] font-[family-name:var(--font-display)] text-5xl leading-[1.15] font-bold text-balance text-white md:text-7xl">
              تكة
            </h1>
            <p className="animate-[fadeRise_1.05s_ease-out] text-2xl font-medium text-[#ffd7b0] md:text-3xl">
              كله على تكة
            </p>
            <p className="animate-[fadeRise_1.2s_ease-out] max-w-xl text-base leading-8 text-white/80 md:text-lg">
              اطلب الأكل البيتي من مطابخ قريبة منك، وتابع طلبك من التأكيد حتى
              الاستلام.
            </p>

            <div className="animate-[fadeRise_1.35s_ease-out] flex flex-wrap gap-3 pt-2">
              {isClerkConfigured ? (
                <>
                  <SignedOut>
                    <Link
                      href="/sign-up"
                      className="bg-[var(--brand-primary)] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--brand-secondary)]"
                    >
                      ابدأ الآن
                    </Link>
                    <Link
                      href="/kitchens"
                      className="border border-white/35 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      استكشف المطابخ
                    </Link>
                  </SignedOut>
                  <SignedIn>
                    <Link
                      href="/dashboard"
                      className="bg-[var(--brand-primary)] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--brand-secondary)]"
                    >
                      دخول لوحتي
                    </Link>
                    <Link
                      href="/kitchens"
                      className="border border-white/35 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                    >
                      استكشف المطابخ
                    </Link>
                  </SignedIn>
                </>
              ) : (
                <Link
                  href="/kitchens"
                  className="bg-[var(--brand-primary)] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--brand-secondary)]"
                >
                  استكشف المطابخ
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8f1] px-6 py-20 text-[#4a2e22] md:px-10">
        <div className="mx-auto grid w-full max-w-6xl gap-12 md:grid-cols-[1.1fr_0.9fr] md:items-end">
          <div className="space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold md:text-4xl">
              أكل بيتي… أقرب مما تتخيل
            </h2>
            <p className="max-w-xl text-base leading-8 text-[#6b4a3a] md:text-lg">
              تكة تربطك بمطابخ منزلية وسحابية في نطاقك، بطلب واضح وعربون مضمون
              ومتابعة حية حتى يصل طلبك.
            </p>
          </div>
          <div className="space-y-5 text-base leading-8 text-[#6b4a3a]">
            <p className="border-r-4 border-[var(--brand-primary)] pr-4">
              اختر مطبخًا قريبًا وشوف المنيو.
            </p>
            <p className="border-r-4 border-[var(--brand-secondary)] pr-4">
              اطلب وادفع العربون بخطوات بسيطة.
            </p>
            <p className="border-r-4 border-[#8b5e3c] pr-4">
              تابع الحالة والشات لحظة بلحظة.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#2a1a14] px-6 py-20 md:px-10">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-[var(--brand-primary)]/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-4">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">
              عندك مطبخ؟ انضم لتكة
            </h2>
            <p className="text-base leading-8 text-white/75 md:text-lg">
              اعرض أصنافك، استقبل الطلبات، راجع العربون، وحدّث حالة التحضير
              والتسليم من مكان واحد.
            </p>
          </div>
          <Link
            href={isClerkConfigured ? "/sign-up" : "/dashboard/kitchen/onboarding"}
            className="inline-flex w-fit bg-white px-6 py-3.5 text-base font-semibold text-[#2a1a14] transition hover:bg-[#ffd7b0]"
          >
            سجّل كمطبخ
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#140e0b] px-6 py-8 text-sm text-white/55 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            تكة
          </p>
          <p>كله على تكة — منصة الأكل البيتي القريب منك.</p>
        </div>
      </footer>
    </main>
  );
}
