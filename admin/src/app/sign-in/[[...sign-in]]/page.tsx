import { headers } from "next/headers";
import { SignIn } from "@clerk/nextjs";

import { AppSignInForm } from "@/components/auth/app-sign-in-form";
import { isClerkConfigured } from "@/lib/clerk";
import { getTakkaSurface } from "@/lib/surface";

export default async function SignInPage() {
  const headerStore = await headers();
  const surface = getTakkaSurface(headerStore.get("host"));

  if (!isClerkConfigured) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
        <div className="w-full max-w-md border border-[#ead9c8] bg-white p-6 text-center">
          <h1 className="text-2xl font-bold">Clerk غير مفعّل بعد</h1>
        </div>
      </main>
    );
  }

  if (surface === "app") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
        <div className="w-full max-w-md border border-[#ead9c8] bg-white p-6 shadow-sm">
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
            <p className="text-sm leading-7 text-[#6b4a3a]">
              ادخل بالإيميل وكلمة المرور لمتابعة طلباتك أو إدارة مطبخك.
            </p>
          </div>
          <AppSignInForm />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6 py-16">
      <div className="w-full max-w-md border border-[#ead9c8] bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-bold">دخول الإدارة</h1>
          <p className="text-sm leading-7 text-[#6b4a3a]">
            لوحة تحكم الأدمن فقط — منفصلة عن تطبيق العملاء والمطابخ.
          </p>
        </div>
        <div className="flex justify-center">
          <SignIn
            forceRedirectUrl="/dashboard/admin"
            signUpUrl="/sign-in"
            appearance={{
              elements: {
                card: "shadow-none border-0",
                rootBox: "w-full",
                socialButtonsBlockButton: "hidden",
                dividerRow: "hidden",
                socialButtonsRoot: "hidden",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
