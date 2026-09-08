import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-16 md:px-10">
        <div className="flex flex-col gap-4">
          <span className="inline-flex w-fit rounded-full bg-orange-100 px-4 py-1 text-sm font-medium text-orange-700">
            تكة | Admin Foundation
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
              بداية التنفيذ الفعلي لمشروع تكة
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-zinc-600">
              تم تأسيس مشروع <code>Next.js</code> ليكون قاعدة لوحة الإدارة
              والباك إند الأولية، مع تجهيز الربط لـ <code>Neon</code> عبر{" "}
              <code>Prisma</code> وإضافة الأساسات اللازمة للمصادقة والملفات
              والتحديثات اللحظية.
            </p>
          </div>
          {isClerkConfigured ? (
            <div className="flex flex-wrap gap-3 pt-2">
              <SignedOut>
                <Link
                  href="/sign-in"
                  className="rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90"
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-full border border-[var(--brand-secondary)] px-5 py-3 font-medium text-[var(--brand-secondary)] transition hover:bg-orange-50"
                >
                  إنشاء حساب
                </Link>
                <Link
                  href="/kitchens"
                  className="rounded-full border border-zinc-300 px-5 py-3 font-medium text-zinc-800 transition hover:bg-white"
                >
                  استعراض المطابخ
                </Link>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="rounded-full bg-[var(--brand-primary)] px-5 py-3 font-medium text-white transition hover:opacity-90"
                >
                  دخول اللوحة
                </Link>
                <div className="flex items-center rounded-full border border-zinc-200 bg-white px-4 py-2">
                  <UserButton afterSignOutUrl="/" />
                </div>
                <Link
                  href="/kitchens"
                  className="rounded-full border border-zinc-300 bg-white px-5 py-3 font-medium text-zinc-800 transition hover:bg-zinc-50"
                >
                  عرض المطابخ
                </Link>
              </SignedIn>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              مرحلة المصادقة جاهزة برمجيًا، وتنتظر فقط مفاتيح `Clerk` الحقيقية
              لتفعيل تسجيل الدخول وإنشاء الحساب.
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">ما تم تأسيسه</h2>
            <ul className="space-y-3 text-zinc-700">
              <li>مشروع `Next.js` بنمط `App Router`.</li>
              <li>تهيئة أولية لـ `Prisma` مع نموذج بيانات يعكس وثائق المشروع.</li>
              <li>ملف `.env.example` لخدمات `Neon`, `Clerk`, `UploadThing`, `Pusher`.</li>
              <li>مكتبات تأسيسية داخل `src/lib` للبيئة وقاعدة البيانات والـ realtime.</li>
              <li>مسار فحص جاهزية عند `api/health`.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">الخطوة التنفيذية التالية</h2>
            <ol className="space-y-3 text-zinc-700">
              <li>إدخال قيم البيئة الفعلية وربط قاعدة `Neon`.</li>
              <li>تشغيل `Prisma generate` ثم `db push`.</li>
              <li>إنشاء نظام التوثيق والأدوار.</li>
              <li>بناء مسارات اعتماد المطابخ والطلبات.</li>
            </ol>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">معمارية التنفيذ الحالية</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <h3 className="font-semibold">Database</h3>
              <p className="mt-2 text-sm text-zinc-600">Neon PostgreSQL</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <h3 className="font-semibold">Backend</h3>
              <p className="mt-2 text-sm text-zinc-600">Next.js Route Handlers</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <h3 className="font-semibold">ORM</h3>
              <p className="mt-2 text-sm text-zinc-600">Prisma</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <h3 className="font-semibold">Realtime</h3>
              <p className="mt-2 text-sm text-zinc-600">Pusher</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
