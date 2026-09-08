import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-[var(--brand-secondary)]">
          Access Restricted
        </p>
        <h1 className="mt-3 text-3xl font-bold">غير مصرح لك بدخول هذه الصفحة</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-600">
          الدور الحالي لحسابك لا يملك صلاحية الوصول إلى هذه المساحة. يمكنك
          الرجوع إلى لوحة التحكم أو استعراض المطابخ المتاحة.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-medium text-white"
          >
            العودة إلى اللوحة
          </Link>
          <Link
            href="/kitchens"
            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium"
          >
            استعراض المطابخ
          </Link>
        </div>
      </div>
    </main>
  );
}
