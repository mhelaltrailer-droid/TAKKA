import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk";
import { getTakkaSurface } from "@/lib/surface";

export default async function Home() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  const surface = getTakkaSurface(host);

  if (surface === "admin") {
    redirect("/sign-in");
  }

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

        <div className="relative z-10 mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col justify-between px-6 py-8 md:px-10">
          <header className="flex items-center justify-between gap-4">
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-white md:text-4xl">
              تكة
            </p>
            {isClerkConfigured ? (
              <div className="flex items-center gap-3">
                <SignedOut>
                  <Link href="/sign-in" className="text-sm font-medium text-white/85">
                    دخول
                  </Link>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            ) : null}
          </header>

          <div className="max-w-2xl space-y-7 pb-10 pt-16">
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold text-white md:text-7xl">
              تكة
            </h1>
            <p className="text-2xl font-medium text-[#ffd7b0] md:text-3xl">
              كله على تكة
            </p>
            <p className="max-w-xl text-base leading-8 text-white/80 md:text-lg">
              نفس تجربة تطبيق الأندرويد على الويب: سجّل برقم هاتفك، اختر عميل أو
              مطبخ، واطلب أو أدِر مطبخك بسهولة.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/sign-up"
                className="bg-[var(--brand-primary)] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[var(--brand-secondary)]"
              >
                إنشاء حساب
              </Link>
              <Link
                href="/sign-in"
                className="border border-white/35 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/kitchens"
                className="border border-white/35 bg-white/10 px-6 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                استكشف المطابخ
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
