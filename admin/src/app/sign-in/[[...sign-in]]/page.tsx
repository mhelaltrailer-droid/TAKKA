import { SignIn } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk";

export default function SignInPage() {
  if (!isClerkConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold">Clerk غير مفعّل بعد</h1>
          <p className="mt-3 text-sm leading-7 text-zinc-600">
            أضف مفاتيح <code>Clerk</code> الحقيقية داخل ملف البيئة لتفعيل تسجيل
            الدخول وإنشاء الحساب.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-sm text-zinc-600">
            سجّل دخولك لمتابعة طلباتك أو إدارة مطبخك.
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                card: "shadow-none border-0",
                rootBox: "w-full",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
